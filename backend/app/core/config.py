import os
from dataclasses import dataclass


def _csv_env(name: str, default: str) -> list[str]:
    value = os.getenv(name, default)
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    app_name: str = "Insurance Plan Analyzer API"
    cors_origins: list[str] = None
    cors_origin_regex: str | None = r"https://.*\.vercel\.app"
    llm_api_key: str | None = None
    llm_base_url: str = "https://api.deepseek.com/v1"
    llm_model: str = "deepseek-chat"
    max_upload_size_mb: int = 20
    enable_ocr: bool = True

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            cors_origins=_csv_env(
                "CORS_ORIGINS",
                "http://localhost:3000,http://127.0.0.1:3000",
            ),
            cors_origin_regex=os.getenv("CORS_ORIGIN_REGEX", r"https://.*\.vercel\.app"),
            llm_api_key=os.getenv("DEEPSEEK_API_KEY") or os.getenv("OPENAI_API_KEY"),
            llm_base_url=os.getenv("LLM_BASE_URL", "https://api.deepseek.com/v1"),
            llm_model=os.getenv("LLM_MODEL", "deepseek-chat"),
            max_upload_size_mb=int(os.getenv("MAX_UPLOAD_SIZE_MB", "20")),
            enable_ocr=os.getenv("ENABLE_OCR", "true").lower() == "true",
        )


settings = Settings.from_env()
