import type { AnalysisResult } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export type LlmCredentials = {
  apiKey: string;
  baseUrl?: string;
  model?: string;
};

async function parseResponse(response: Response): Promise<AnalysisResult[]> {
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const detail =
      payload && typeof payload === "object" && "detail" in payload
        ? String((payload as { detail?: unknown }).detail)
        : "分析请求失败，请稍后重试";
    throw new Error(detail);
  }

  if (!Array.isArray(payload)) {
    throw new Error("后端返回格式异常");
  }
  return payload as AnalysisResult[];
}

export async function analyzeFiles(files: File[], credentials: LlmCredentials): Promise<AnalysisResult[]> {
  const form = new FormData();
  files.forEach((file) => form.append("files", file));
  form.append("api_key", credentials.apiKey);
  if (credentials.baseUrl) form.append("base_url", credentials.baseUrl);
  if (credentials.model) form.append("model", credentials.model);
  const response = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: "POST",
    body: form,
  });
  return parseResponse(response);
}

export async function analyzeText(text: string, name: string | undefined, credentials: LlmCredentials): Promise<AnalysisResult[]> {
  const response = await fetch(`${API_BASE_URL}/api/analyze-text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      name,
      api_key: credentials.apiKey,
      base_url: credentials.baseUrl,
      model: credentials.model,
    }),
  });
  return parseResponse(response);
}
