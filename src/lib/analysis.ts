import type { AnalysisResult, TrendType } from "./types";

export function buildTrendData(results: AnalysisResult[], type: TrendType): Array<Record<string, number | string | null>> {
  const chartData: Array<Record<string, number | string | null>> = [];

  results.forEach((result) => {
    const name = result["产品名称"] || "未命名方案";
    const source =
      type === "cashValueTrend"
        ? (result["利益演示表"] || []).map((row) => ({
            year: `第${row.year}年`,
            [name]: row.cash_value,
          }))
        : (result.irrTrend || []).map((value, index) => ({
            year: `第${index + 1}年`,
            [name]: value,
          }));

    source.forEach((point) => {
      const entry = chartData.find((item) => item.year === point.year);
      if (entry) {
        Object.assign(entry, point);
      } else {
        chartData.push(point);
      }
    });
  });

  return chartData;
}

export function currency(value: number | string | undefined): string {
  const numeric = typeof value === "number" ? value : Number(value || 0);
  if (!Number.isFinite(numeric)) return "--";
  return numeric.toLocaleString("zh-CN", { maximumFractionDigits: 0 });
}
