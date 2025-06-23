import os
import json
import pdfplumber
import camelot
import pytesseract
from PIL import Image
from io import BytesIO
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
import numpy_financial as npf

# 创建 FastAPI 应用
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# 使用 OpenAI SDK 调用 DeepSeek API
client = OpenAI(
    api_key="sk-794c238477fc4efe89d6854e14040403",
    base_url="https://api.deepseek.com/v1"
)

def extract_text_and_tables_bytes(data: bytes) -> tuple[str, list]:
    texts, tables = [], []
    with pdfplumber.open(BytesIO(data)) as pdf:
        for page in pdf.pages:
            txt = page.extract_text() or ""
            if not txt.strip():
                img = page.to_image(resolution=200).original
                txt = pytesseract.image_to_string(img, lang='chi_sim+eng')
            texts.append(txt)
            try:
                tbs = camelot.read_pdf(BytesIO(data), pages=str(page.page_number), flavor='lattice')
                for tb in tbs:
                    tables.append(tb.df)
            except Exception:
                pass
    return "\n".join(texts), tables

def parse_with_deepseek(text: str) -> dict:
    schema = {
        "产品名称": "string",
        "保多少": "number",
        "保多久": "string",
        "首年交多少": "number",
        "交多久": "integer",
        "利益演示表": [{"year": "integer", "cash_value": "number", "surrender": "number"}]
    }
    prompt = (
        "请严格只输出 JSON 格式，不要添加解释或 Markdown。\n\n"
        + text
        + "\n\n按照下面 schema 输出纯 JSON：\n"
        + json.dumps(schema, ensure_ascii=False)
    )
    resp = client.chat.completions.create(
        model="deepseek-chat",
        messages=[{"role": "user", "content": prompt}],
        temperature=0
    )
    raw = resp.choices[0].message.content.strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        s, e = raw.find("{"), raw.rfind("}")
        return json.loads(raw[s:e+1])

def compute_payback_and_cashflows(parsed: dict) -> tuple[list[float], int]:
    premium = parsed.get("首年交多少", 0.0) or 0.0
    pay_years = parsed.get("交多久", 0) or 0
    table = parsed.get("利益演示表", [])
    cashflows, payback = [], None
    for row in table:
        t = row.get("year", 0)
        cumulative = premium * min(t, pay_years)
        cf = row.get("cash_value", 0.0) - cumulative
        cashflows.append(cf)
        if payback is None and cf >= 0:
            payback = t
    return cashflows, payback

def compute_irr_trend(parsed: dict, payback: int) -> list[float]:
    trend = []
    premium = parsed.get("首年交多少", 0.0) or 0.0
    pay_years = parsed.get("交多久", 0) or 0
    table = parsed.get("利益演示表", [])
    for row in table:
        t = row.get("year", 0)
        cash_value = row.get("cash_value", 0.0)
        cash_flows = [-premium] * min(t, pay_years) + [0] * max(0, t - pay_years)
        cash_flows[-1] += cash_value
        try:
            irr = npf.irr(cash_flows)
            trend.append(round(irr * 100, 6))
        except Exception:
            trend.append(None)
    pad_len = payback - 1 if payback and payback > 0 else 0
    return [None] * pad_len + trend[pad_len:]

def generate_summary_deepseek(parsed: dict, payback: int, irr_trend: list[float]) -> str:
    table = parsed.get("利益演示表", [])
    avg_growth = None
    if len(table) >= 2:
        start, end = table[0]["cash_value"], table[-1]["cash_value"]
        yrs = table[-1]["year"]
        try:
            avg_growth = round(((end / start) ** (1 / yrs) - 1) * 100, 2)
        except Exception:
            pass
    valid = [v for v in irr_trend if v is not None]
    irr_min, irr_max = (min(valid), max(valid)) if valid else (None, None)
    prompt = (
        f"请简短点评“{parsed.get('产品名称','')}”："
        f"第{payback}年回本，IRR约在{irr_min:.2f}%~{irr_max:.2f}%，"
        f"年均现金价值增长约{avg_growth}%；给出适合人群建议。"
        "\内容要争对现在普通人选购保险产品时的痛点，不要使用任何**或其他 Markdown 标记。"
    )
    resp = client.chat.completions.create(
        model="deepseek-chat",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7
    )
    return resp.choices[0].message.content.strip()

@app.post("/api/analyze")
async def analyze(files: list[UploadFile] = File(...)):
    if not files:
        raise HTTPException(422, "No files uploaded")
    results = []
    for f in files:
        data = await f.read()
        text, tables = extract_text_and_tables_bytes(data)
        parsed = parse_with_deepseek(text)
        cashflows, payback = compute_payback_and_cashflows(parsed)
        irr_trend = compute_irr_trend(parsed, payback)
        summary = generate_summary_deepseek(parsed, payback, irr_trend)
        results.append({
            **parsed,
            "cashflows": cashflows,
            "computedPayback": payback,
            "irrTrend": irr_trend,
            "summary": summary
        })
    return results

# import os
# import json
# import pdfplumber
# import camelot
# import pytesseract
# from PIL import Image
# from io import BytesIO
# from fastapi import FastAPI, File, UploadFile, HTTPException
# from fastapi.middleware.cors import CORSMiddleware
# from openai import OpenAI
# from scipy.optimize import newton
# import numpy_financial as npf

# # 创建 FastAPI 应用
# app = FastAPI()
# # CORS 设置
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:3000"],
#     allow_methods=["*"],
#     allow_headers=["*"]
# )
# # 初始化 OpenAI 客户端
# client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


# def extract_text_and_tables_bytes(data: bytes) -> tuple[str, list]:
#     """
#     从 PDF 二进制数据提取全文（含 OCR）和表格（Camelot），
#     返回 (text, tables) 两元组
#     """
#     texts, tables = [], []
#     with pdfplumber.open(BytesIO(data)) as pdf:
#         for page in pdf.pages:
#             txt = page.extract_text() or ""
#             if not txt.strip():
#                 img = page.to_image(resolution=200).original
#                 txt = pytesseract.image_to_string(img, lang='chi_sim+eng')
#             texts.append(txt)
#             try:
#                 tbs = camelot.read_pdf(BytesIO(data), pages=str(page.page_number), flavor='lattice')
#                 for tb in tbs:
#                     tables.append(tb.df)
#             except Exception:
#                 continue
#     return "\n".join(texts), tables


# def parse_with_gpt(text: str) -> dict:
#     """
#     调用 GPT 严格输出结构化 JSON：
#     {
#       "产品名称": string,
#       "保多少": number,
#       "保多久": string,
#       "首年交多少": number,
#       "交多久": integer,
#       "利益演示表": [{"year": int, "cash_value": num, "surrender": num}, ...]
#     }
#     """
#     prompt = f"""
# ⚠️ 严格只输出 JSON，不要解释文字或 Markdown。
# 下面是一份保险产品的纯文本（OCR 完成）：

# {text}

# 请严格返回如下 JSON：
# {{
#   "产品名称": string,
#   "保多少": number,
#   "保多久": string,
#   "首年交多少": number,
#   "交多久": integer,
#   "利益演示表": [{{"year": integer, "cash_value": number, "surrender": number}}, ...]
# }}
# """
#     resp = client.chat.completions.create(
#         model="gpt-4o-mini",
#         messages=[{"role":"user","content":prompt}]
#     )
#     raw = resp.choices[0].message.content.strip()
#     try:
#         return json.loads(raw)
#     except json.JSONDecodeError:
#         s, e = raw.find('{'), raw.rfind('}')
#         return json.loads(raw[s:e+1])


# def compute_payback_and_cashflows(parsed: dict) -> tuple[list[float], int]:
#     """
#     年度净现金流 = 年末现金价值 - 累计已缴保费
#     返回 (cashflows, payback_year)
#     """
#     premium = parsed.get("首年交多少", 0.0) or 0.0
#     pay_years = parsed.get("交多久", 0) or 0
#     table = parsed.get("利益演示表", [])
#     cashflows, payback = [], None
#     for row in table:
#         t = row.get("year", 0)
#         cumulative = premium * min(t, pay_years)
#         cf = row.get("cash_value", 0.0) - cumulative
#         cashflows.append(cf)
#         if payback is None and cf >= 0:
#             payback = t
#     return cashflows, payback


# def compute_irr_trend(parsed: dict, payback:int) -> list[float]:
#     trend = []
#     premium = parsed.get("首年交多少", 0.0) or 0.0
#     pay_years = parsed.get("交多久", 0) or 0
#     table = parsed.get("利益演示表", [])

#     for row in table:
#         t = row.get("year", 0)
#         cash_value = row.get("cash_value", 0.0)
        
#         # 构建现金流列表：前 t 年为 -premium，第 t 年 +cash_value
#         cash_flows = [-premium] * min(t, pay_years) + [0] * max(0, t - pay_years)
#         cash_flows[-1] += cash_value

#         try:
#             irr = npf.irr(cash_flows)
#             trend.append(round(irr*100,6))
#         except:
#             trend.append(None)
#     return [None]*(payback-1)+trend[payback-1:]

# def generate_summary(parsed: dict, payback: int, irr_trend: list[float]) -> str:
#     """
#     调用 GPT 生成 3-5 句专业中文点评
#     """
#     table = parsed.get("利益演示表", [])
#     avg_growth = None
#     if len(table)>=2:
#         start, end = table[0]["cash_value"], table[-1]["cash_value"]
#         yrs = table[-1]["year"]
#         try:
#             avg_growth = round(((end/start)**(1/yrs)-1)*100,2)
#         except:
#             pass
#     valid = [v for v in irr_trend if v is not None]
#     irr_min, irr_max = (min(valid), max(valid)) if valid else (None,None)
#     prompt = (
#         f"请用3-5句专业中文点评方案“{parsed.get('产品名称','')}”，"
#         f"第{payback}年回本、IRR稳定在{irr_min:.2f}%~{irr_max:.2f}%、"
#         f"现金价值年均增长约{avg_growth}%；并给适合人群建议。"
#     )
#     resp = client.chat.completions.create(
#         model="gpt-4o-mini",
#         messages=[{"role":"user","content":prompt}]
#     )
#     return resp.choices[0].message.content.strip()


# @app.post("/api/analyze")
# async def analyze(files: list[UploadFile] = File(...)):
#     if not files:
#         raise HTTPException(422, "No files uploaded")
#     results = []
#     for f in files:
#         data = await f.read()
#         text, tables = extract_text_and_tables_bytes(data)
#         parsed = parse_with_gpt(text)
#         cashflows, payback = compute_payback_and_cashflows(parsed)
#         irr_trend = compute_irr_trend(parsed, payback)
#         summary = generate_summary(parsed, payback, irr_trend)

#         # 直接返回原始结构化数据及计算结果，前端自行绘图
#         results.append({
#             **parsed,
#             "cashflows": cashflows,
#             "computedPayback": payback,
#             "irrTrend": irr_trend,
#             "summary": summary
#         })
#     return results

