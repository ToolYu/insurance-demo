from io import BytesIO
from pathlib import Path

import pdfplumber

try:
    import pytesseract
except Exception:  # pragma: no cover - optional system dependency
    pytesseract = None


SUPPORTED_TEXT_TYPES = {
    "text/plain",
    "text/markdown",
    "application/json",
}


def extract_text_from_upload(
    data: bytes,
    filename: str | None,
    content_type: str | None,
    enable_ocr: bool,
    max_pdf_pages: int,
) -> str:
    suffix = Path(filename or "").suffix.lower()
    if content_type in SUPPORTED_TEXT_TYPES or suffix in {".txt", ".md", ".json"}:
        return data.decode("utf-8", errors="ignore")
    if content_type == "application/pdf" or suffix == ".pdf":
        return extract_pdf_text(
            data,
            enable_ocr=enable_ocr,
            max_pdf_pages=max_pdf_pages,
        )
    raise ValueError("仅支持 PDF、TXT、Markdown 或 JSON 文本文件")


def extract_pdf_text(data: bytes, enable_ocr: bool, max_pdf_pages: int) -> str:
    texts: list[str] = []
    with pdfplumber.open(BytesIO(data)) as pdf:
        for page in pdf.pages[:max_pdf_pages]:
            text = page.extract_text() or ""
            if not text.strip() and enable_ocr and pytesseract is not None:
                image = page.to_image(resolution=200).original
                text = pytesseract.image_to_string(image, lang="chi_sim+eng")
            texts.append(text)
    return "\n".join(texts).strip()
