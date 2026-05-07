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
    parsed.setdefault("产品名称", name_hint or "未命名方案")
    parsed.setdefault("保多少", 0)
    parsed.setdefault("保多久", "")
    parsed["首年交多少"] = _to_float(parsed.get("首年交多少"))
    parsed["交多久"] = int(_to_float(parsed.get("交多久")))
    table = parsed.get("利益演示表")
    parsed["利益演示表"] = normalize_benefit_table(table if isinstance(table, list) else [])
    return parsed


def normalize_benefit_table(table: list[Any]) -> list[dict[str, float | int]]:
    normalized: list[dict[str, float | int]] = []
    for index, row in enumerate(table, start=1):
        if not isinstance(row, dict):
            continue
        year = int(_to_float(row.get("year") or row.get("年度") or index))
        normalized.append(
            {
                "year": year,
                "cash_value": _to_float(row.get("cash_value") or row.get("现金价值")),
                "surrender": _to_float(row.get("surrender") or row.get("退保金")),
            }
        )
    return sorted(normalized, key=lambda item: item["year"])


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
    cleaned = str(value).replace(",", "").replace("元", "").replace("年", "").strip()
    try:
        return float(cleaned)
    except ValueError:
        return 0.0
