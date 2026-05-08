export type BenefitRow = {
  year: number;
  cash_value: number;
  surrender?: number;
};

export type AnalysisResult = {
  产品名称: string;
  保多少?: number | string;
  保多久?: string;
  首年交多少?: number;
  交多久?: number;
  总保费?: number;
  现金价值?: number;
  身故保障?: number | string;
  预期收益?: number | string;
  利益演示表: BenefitRow[];
  cashflows?: number[];
  computedPayback?: number | null;
  irrTrend: Array<number | null>;
  summary: string;
};

export type TrendType = "cashValueTrend" | "irrTrend";
