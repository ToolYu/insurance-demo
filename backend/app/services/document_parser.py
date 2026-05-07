from io import BytesIO
import os
from pathlib import Path
import tempfile

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


def extract_text_from_upload(data: bytes, filename: str | None, content_type: str | None, enable_ocr: bool) -> str:
    suffix = Path(filename or "").suffix.lower()
    if content_type in SUPPORTED_TEXT_TYPES or suffix in {".txt", ".md", ".json"}:
        return data.decode("utf-8", errors="ignore")
    if content_type == "application/pdf" or suffix == ".pdf":
        return extract_pdf_text(data, enable_ocr=enable_ocr)
    raise ValueError("仅支持 PDF、TXT、Markdown 或 JSON 文本文件")


def extract_pdf_text(data: bytes, enable_ocr: bool) -> str:
    texts: list[str] = []
    with pdfplumber.open(BytesIO(data)) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            if not text.strip() and enable_ocr and pytesseract is not None:
                image = page.to_image(resolution=200).original
                text = pytesseract.image_to_string(image, lang="chi_sim+eng")
            texts.append(text)
    table_text = "\n".join(extract_pdf_tables(data))
    return "\n".join([*texts, table_text]).strip()


def extract_pdf_tables(data: bytes) -> list[str]:
    os.environ.setdefault("MPLCONFIGDIR", "/tmp/matplotlib")
    try:
        import camelot
    except Exception:
        return []

    table_texts: list[str] = []
    with tempfile.NamedTemporaryFile(suffix=".pdf") as tmp:
        tmp.write(data)
        tmp.flush()
        try:
            tables = camelot.read_pdf(tmp.name, pages="all", flavor="lattice")
        except Exception:
            try:
                tables = camelot.read_pdf(tmp.name, pages="all", flavor="stream")
            except Exception:
                return []

        for table in tables:
            table_texts.append(table.df.to_csv(index=False, header=False))
    return table_texts
