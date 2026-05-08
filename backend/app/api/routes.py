import logging
from time import perf_counter

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.core.config import settings
from app.models import AnalyzeTextRequest
from app.services.analysis import analyze_plan_text
from app.services.document_parser import extract_text_from_upload

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/analyze")
async def analyze(
    files: list[UploadFile] = File(...),
    api_key: str | None = Form(default=None),
    base_url: str | None = Form(default=None),
    model: str | None = Form(default=None),
) -> list[dict]:
    if not files:
        raise HTTPException(status_code=422, detail="请至少上传一个文件")

    results: list[dict] = []
    max_size = settings.max_upload_size_mb * 1024 * 1024
    for upload in files:
        started_at = perf_counter()
        data = await upload.read()
        if len(data) > max_size:
            raise HTTPException(status_code=413, detail=f"{upload.filename} 超过 {settings.max_upload_size_mb}MB 限制")
        try:
            text = extract_text_from_upload(
                data,
                filename=upload.filename,
                content_type=upload.content_type,
                enable_ocr=settings.enable_ocr,
                max_pdf_pages=settings.max_pdf_pages,
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        if not text.strip():
            raise HTTPException(status_code=400, detail=f"{upload.filename} 未提取到可分析文本")
        extraction_seconds = perf_counter() - started_at
        logger.info("extracted %s in %.2fs, chars=%s", upload.filename, extraction_seconds, len(text))
        limited_text = text[: settings.max_llm_chars]
        results.append(
            analyze_plan_text(
                limited_text,
                name_hint=upload.filename,
                api_key=api_key,
                base_url=base_url,
                model=model,
            )
        )
        logger.info("analyzed %s in %.2fs", upload.filename, perf_counter() - started_at)
    return results


@router.post("/analyze-text")
async def analyze_text(payload: AnalyzeTextRequest) -> list[dict]:
    return [
        analyze_plan_text(
            payload.text,
            name_hint=payload.name,
            api_key=payload.api_key,
            base_url=payload.base_url,
            model=payload.model,
        )
    ]
