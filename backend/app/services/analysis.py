import re
from typing import Any

import numpy_financial as npf

from app.services.llm import generate_plan_summary, parse_plan_text


def analyze_plan_text(
    text: str,
    name_hint: str | None = None,
    api_key: str | None = None,
    base_url: str | None = None,
    model: str | None = None,
) -> dict[str, Any]:
    parsed = normalize_plan(
        parse_plan_text(text, name_hint=name_hint, api_key=api_key, base_url=base_url, model=model),
        name_hint=name_hint,
    )
    cashflows, payback = compute_payback_and_cashflows(parsed)
    irr_trend = compute_irr_trend(parsed, payback)
    summary = generate_plan_summary(parsed, payback, irr_trend, api_key=api_key, base_url=base_url, model=model)
    return {
        **parsed,
        "cashflows": cashflows,
        "computedPayback": payback,
        "irrTrend": irr_trend,
        "summary": summary,
    }


def normalize_plan(parsed: dict[str, Any], name_hint: str | None = None) -> dict[str, Any]:
    parsed["产品名称"] = _first_value(parsed, ["产品名称", "product_name", "产品", "名称"], name_hint or "Unnamed Plan")
    parsed["保多少"] = _first_value(parsed, ["保多少", "基本保额", "保险金额", "保额", "coverage_amount"], 0)
    parsed["身故保障"] = _first_value(parsed, ["身故保障", "身故保险金", "身故保额", "身故给付", "death_benefit"], parsed.get("保多少", 0))
    parsed["保多久"] = _first_value(parsed, ["保多久", "保障期间", "保险期间", "coverage_period"], "")
    parsed["首年交多少"] = _to_float(_first_value(parsed, ["首年交多少", "年缴保费", "首年保费", "annual_premium", "premium"], 0))
    parsed["交多久"] = int(_to_float(_first_value(parsed, ["交多久", "缴费年限", "交费期间", "payment_years", "pay_years"], 0)))

    table = _first_value(parsed, ["利益演示表", "现金价值表", "利益表", "演示表", "benefit_table", "cash_value_table"], [])
    parsed["利益演示表"] = normalize_benefit_table(table if isinstance(table, list) else [])
    parsed["总保费"] = _to_float(_first_value(parsed, ["总保费", "累计保费", "总缴费", "total_premium"], 0))
    if parsed["总保费"] <= 0:
        parsed["总保费"] = parsed["首年交多少"] * parsed["交多久"]

    latest_cash_value = parsed["利益演示表"][-1]["cash_value"] if parsed["利益演示表"] else 0
    parsed["现金价值"] = _to_float(_first_value(parsed, ["现金价值", "期末现金价值", "latest_cash_value", "cash_value"], latest_cash_value))
    if parsed["现金价值"] <= 0:
        parsed["现金价值"] = latest_cash_value

    parsed["预期收益"] = _first_value(parsed, ["预期收益", "收益", "expected_return"], 0)
    if _to_float(parsed["预期收益"]) == 0 and parsed["现金价值"] and parsed["总保费"]:
        parsed["预期收益"] = round(parsed["现金价值"] - parsed["总保费"], 2)
    return parsed


def normalize_benefit_table(table: list[Any]) -> list[dict[str, float | int]]:
    normalized: list[dict[str, float | int]] = []
    for index, row in enumerate(table, start=1):
        if not isinstance(row, dict):
            continue
        year = int(_to_float(_first_value(row, ["year", "年度", "保单年度", "policy_year"], index)))
        cash_value = _to_float(_first_value(row, ["cash_value", "现金价值", "现金价值总额", "账户价值", "期末现金价值"], 0))
        surrender = _to_float(_first_value(row, ["surrender", "退保金", "退保价值", "退保现金价值"], cash_value))
        if year <= 0 or cash_value <= 0:
            continue
        normalized.append(
            {
                "year": year,
                "cash_value": cash_value,
                "surrender": surrender,
            }
        )
    deduped: dict[int, dict[str, float | int]] = {}
    for row in sorted(normalized, key=lambda item: item["year"]):
        deduped[int(row["year"])] = row
    return list(deduped.values())


def compute_payback_and_cashflows(parsed: dict[str, Any]) -> tuple[list[float], int | None]:
    premium = _to_float(parsed.get("首年交多少"))
    pay_years = int(_to_float(parsed.get("交多久")))
    cashflows: list[float] = []
    payback: int | None = None

    for row in parsed.get("利益演示表", []):
        year = int(_to_float(row.get("year")))
        cumulative_premium = premium * min(year, pay_years)
        cashflow = _to_float(row.get("cash_value")) - cumulative_premium
        cashflows.append(round(cashflow, 2))
        if payback is None and cashflow >= 0:
            payback = year
    return cashflows, payback


def compute_irr_trend(parsed: dict[str, Any], payback: int | None) -> list[float | None]:
    premium = _to_float(parsed.get("首年交多少"))
    pay_years = int(_to_float(parsed.get("交多久")))
    trend: list[float | None] = []

    if premium <= 0:
        return [None for _ in parsed.get("利益演示表", [])]

    for row in parsed.get("利益演示表", []):
        year = int(_to_float(row.get("year")))
        cash_value = _to_float(row.get("cash_value"))
        cash_flows = [-premium] * min(year, pay_years) + [0] * max(0, year - pay_years)
        if not cash_flows:
            trend.append(None)
            continue
        cash_flows[-1] += cash_value
        try:
            irr = npf.irr(cash_flows)
        except Exception:
            irr = None
        trend.append(round(float(irr) * 100, 6) if irr is not None and irr == irr else None)

    if payback and payback > 1:
        return [None] * min(payback - 1, len(trend)) + trend[payback - 1 :]
    return trend


def _to_float(value: Any) -> float:
    if value is None or value == "":
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    cleaned = (
        str(value)
        .replace(",", "")
        .replace("，", "")
        .replace("人民币", "")
        .replace("元", "")
        .replace("年", "")
        .replace("%", "")
        .strip()
    )
    if "万" in cleaned:
        cleaned = cleaned.replace("万", "")
        multiplier = 10000
    else:
        multiplier = 1
    match = re.search(r"-?\d+(?:\.\d+)?", cleaned)
    if match:
        return float(match.group()) * multiplier
    try:
        return float(cleaned) * multiplier
    except ValueError:
        return 0.0


def _first_value(source: dict[str, Any], keys: list[str], default: Any = None) -> Any:
    for key in keys:
        value = source.get(key)
        if value is not None and value != "":
            return value
    return default
