from pydantic import BaseModel, Field


class AnalyzeTextRequest(BaseModel):
    text: str = Field(..., min_length=1)
    name: str | None = None
    api_key: str | None = None
    base_url: str | None = None
    model: str | None = None


class BenefitRow(BaseModel):
    year: int = 0
    cash_value: float = 0
    surrender: float = 0


class ParsedPlan(BaseModel):
    product_name: str = Field(default="", alias="产品名称")
    coverage_amount: float | str | None = Field(default=None, alias="保多少")
    coverage_period: str | None = Field(default=None, alias="保多久")
    first_year_premium: float = Field(default=0, alias="首年交多少")
    payment_years: int = Field(default=0, alias="交多久")
    benefit_table: list[BenefitRow] = Field(default_factory=list, alias="利益演示表")

    model_config = {"populate_by_name": True}
