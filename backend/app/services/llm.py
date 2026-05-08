import json
from typing import Any

from fastapi import HTTPException
from openai import OpenAI

from app.core.config import settings


PLAN_SCHEMA = {
    "产品名称": "string",
    "保多少": "number|string",
    "身故保障": "number|string",
    "保多久": "string",
    "首年交多少": "number",
    "交多久": "integer",
    "总保费": "number",
    "现金价值": "number",
    "预期收益": "number|string",
    "利益演示表": [{"year": "integer", "cash_value": "number", "surrender": "number"}],
}


def _client(api_key: str | None = None, base_url: str | None = None) -> OpenAI:
    resolved_key = api_key or settings.llm_api_key
    if not resolved_key:
        raise HTTPException(status_code=400, detail="请输入你的 LLM API Key 后再开始分析")
    return OpenAI(api_key=resolved_key, base_url=base_url or settings.llm_base_url)


def parse_plan_text(
    text: str,
    name_hint: str | None = None,
    api_key: str | None = None,
    base_url: str | None = None,
    model: str | None = None,
) -> dict[str, Any]:
    prompt = (
        "你是保险计划书结构化分析助手。请严格只输出 JSON，不要添加解释或 Markdown。\n"
        "如果字段无法确认，请使用空字符串、0 或空数组，不要编造。\n"
        "请尽量从计划书中提取年度利益演示表，用于计算现金价值趋势和 IRR 趋势。\n"
        "字段说明：首年交多少=年缴保费；交多久=缴费年限；总保费=年缴保费*缴费年限；现金价值=演示表最后一年或最晚年度现金价值；身故保障=身故保险金/基本保额/有效保额；预期收益=现金价值-总保费或计划书列明收益。\n"
        "利益演示表每行必须包含 year 和 cash_value，year 使用保单年度数字，cash_value 使用该年度现金价值数字。\n"
        f"文件/方案名称提示：{name_hint or ''}\n\n"
        "保险计划书内容：\n"
        f"{text}\n\n"
        "请按照下面 schema 输出纯 JSON：\n"
        f"{json.dumps(PLAN_SCHEMA, ensure_ascii=False)}"
    )
    raw = _chat(prompt, temperature=0, api_key=api_key, base_url=base_url, model=model)
    return _load_json_object(raw)


def generate_plan_summary(
    parsed: dict[str, Any],
    payback: int | None,
    irr_trend: list[float | None],
    api_key: str | None = None,
    base_url: str | None = None,
    model: str | None = None,
) -> str:
    valid_irr = [value for value in irr_trend if value is not None]
    irr_text = "--"
    if valid_irr:
        irr_text = f"{min(valid_irr):.2f}%~{max(valid_irr):.2f}%"

    prompt = (
        "Write a concise plain-English insurance plan note for a consumer. Avoid Markdown.\n"
        "Include coverage/payment overview, cash value and payback, who it may fit, and key risks.\n"
        f"结构化数据：{json.dumps(parsed, ensure_ascii=False)}\n"
        f"计算回本期：{payback or '未回本'}\n"
        f"IRR 区间：{irr_text}"
    )
    return _chat(prompt, temperature=0.5, api_key=api_key, base_url=base_url, model=model).strip()


def _chat(
    prompt: str,
    temperature: float,
    api_key: str | None = None,
    base_url: str | None = None,
    model: str | None = None,
) -> str:
    response = _client(api_key=api_key, base_url=base_url).chat.completions.create(
        model=model or settings.llm_model,
        messages=[{"role": "user", "content": prompt}],
        temperature=temperature,
    )
    content = response.choices[0].message.content
    return (content or "").strip()


def _load_json_object(raw: str) -> dict[str, Any]:
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        start, end = raw.find("{"), raw.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise HTTPException(status_code=502, detail="LLM 未返回可解析的 JSON")
        try:
            return json.loads(raw[start : end + 1])
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=502, detail="LLM JSON 解析失败") from exc
