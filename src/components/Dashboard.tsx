"use client";

import React, { ChangeEvent, DragEvent, useMemo, useState } from "react";
import { FileText, KeyRound, RotateCcw, UploadCloud, X } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { analyzeFiles, analyzeText } from "@/lib/api";
import { buildTrendData, currency } from "@/lib/analysis";
import type { AnalysisResult } from "@/lib/types";

const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2", "#4d7c0f", "#be185d"];

export default function Dashboard() {
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState("");
  const [planName, setPlanName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://api.deepseek.com/v1");
  const [model, setModel] = useState("deepseek-chat");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<AnalysisResult[]>([]);

  const cashValueTrend = useMemo(() => buildTrendData(results, "cashValueTrend"), [results]);
  const irrTrend = useMemo(() => buildTrendData(results, "irrTrend"), [results]);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    appendFiles(Array.from(event.dataTransfer.files));
  };

  const handleBrowse = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) appendFiles(Array.from(event.target.files));
    event.target.value = "";
  };

  const appendFiles = (incoming: File[]) => {
    setError("");
    setFiles((current) => [...current, ...incoming]);
  };

  const removeFile = (index: number) => {
    setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const startAnalysis = async () => {
    const trimmedText = text.trim();
    if (!files.length && !trimmedText) {
      setError("请上传计划书文件，或粘贴计划书文字后再开始分析。");
      return;
    }
    if (!apiKey.trim()) {
      setError("请先输入你自己的 LLM API Key。");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const credentials = {
        apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim() || undefined,
        model: model.trim() || undefined,
      };
      const nextResults = files.length
        ? await analyzeFiles(files, credentials)
        : await analyzeText(trimmedText, planName.trim() || "文本输入方案", credentials);
      setResults(nextResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : "分析失败，请检查后端服务和环境变量配置。");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFiles([]);
    setText("");
    setPlanName("");
    setApiKey("");
    setError("");
    setResults([]);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal text-slate-950">京保保智能保险计划分析助手</h1>
            <p className="mt-1 text-sm text-slate-600">多文件上传、文字输入、核心指标提取与可视化对比</p>
          </div>
          <Button onClick={reset} className="inline-flex items-center gap-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-100">
            <RotateCcw className="h-4 w-4" />
            新分析
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 p-6 lg:grid-cols-[360px_1fr]">
        <section className="space-y-4">
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold">API 设置</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="block">
                <span className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <KeyRound className="h-4 w-4" />
                  DeepSeek API Key
                </span>
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  type="password"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder="sk-..."
                  autoComplete="off"
                />
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  value={baseUrl}
                  onChange={(event) => setBaseUrl(event.target.value)}
                  placeholder="API Base URL"
                />
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  placeholder="模型名称"
                />
              </div>
              <p className="text-xs leading-5 text-slate-500">API Key 只随本次请求发送到后端，不写入代码，也不会保存在浏览器持久存储中。</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold">输入计划书</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                onDrop={handleDrop}
                onDragOver={(event) => event.preventDefault()}
                className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center transition-colors hover:border-blue-500"
              >
                <UploadCloud className="mx-auto mb-3 h-10 w-10 text-blue-600" />
                <p className="text-sm text-slate-700">
                  拖拽 PDF/TXT 文件，或{" "}
                  <label className="cursor-pointer font-medium text-blue-700 underline">
                    浏览
                    <input type="file" multiple hidden accept=".pdf,.txt,.md,.json,application/pdf,text/plain" onChange={handleBrowse} />
                  </label>
                </p>
              </div>

              <div className="space-y-2">
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  value={planName}
                  onChange={(event) => setPlanName(event.target.value)}
                  placeholder="文本方案名称"
                />
                <textarea
                  className="h-36 w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="也可以直接粘贴计划书文字内容"
                />
              </div>

              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2">
                      <FileText className="h-4 w-4 shrink-0 text-slate-500" />
                      <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
                      <button
                        type="button"
                        aria-label={`移除 ${file.name}`}
                        className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-red-600"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

              <Button
                onClick={startAnalysis}
                disabled={loading}
                className="w-full border-blue-700 bg-blue-700 py-2 text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "分析中..." : "开始分析"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold">方案文字总结</h2>
            </CardHeader>
            <CardContent className="max-h-80 space-y-4 overflow-y-auto">
              {results.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">暂无总结</p>
              ) : (
                results.map((result, index) => (
                  <div key={`${result["产品名称"]}-${index}`}>
                    <h3 className="mb-1 truncate text-sm font-semibold text-blue-800">{result["产品名称"]}</h3>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{result.summary}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold">核心指标对比</h2>
            </CardHeader>
            <CardContent>
              {results.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-500">暂无数据</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b bg-slate-100 text-slate-700">
                        <th className="p-3 font-medium">产品名称</th>
                        <th className="p-3 font-medium">保多少</th>
                        <th className="p-3 font-medium">保多久</th>
                        <th className="p-3 font-medium">首年交多少</th>
                        <th className="p-3 font-medium">交多久</th>
                        <th className="p-3 font-medium">总缴费</th>
                        <th className="p-3 font-medium">回本期</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((result, index) => {
                        const premium = result["首年交多少"] || 0;
                        const years = result["交多久"] || 0;
                        return (
                          <tr key={`${result["产品名称"]}-${index}`} className="border-b hover:bg-slate-50">
                            <td className="max-w-56 truncate p-3">{result["产品名称"]}</td>
                            <td className="p-3">{currency(result["保多少"])}</td>
                            <td className="p-3">{result["保多久"] || "--"}</td>
                            <td className="p-3">{currency(premium)}</td>
                            <td className="p-3">{years || "--"}</td>
                            <td className="p-3">{currency(Number(premium) * Number(years))}</td>
                            <td className="p-3">{result.computedPayback ? `第${result.computedPayback}年` : "--"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <TrendCard title="现金价值趋势图" data={cashValueTrend} results={results} />
          <TrendCard title="IRR 趋势图" data={irrTrend} results={results} unit="%" />
        </section>
      </main>
    </div>
  );
}

function TrendCard({
  title,
  data,
  results,
  unit,
}: {
  title: string;
  data: Array<Record<string, number | string | null>>;
  results: AnalysisResult[];
  unit?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold">{title}</h2>
      </CardHeader>
      <CardContent className="h-80">
        {results.length === 0 ? (
          <p className="py-28 text-center text-sm text-slate-500">暂无图表数据</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 24, left: 12, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis unit={unit} />
              <Tooltip />
              <Legend />
              {results.map((result, index) => (
                <Line
                  key={`${title}-${result["产品名称"]}-${index}`}
                  type="monotone"
                  dataKey={result["产品名称"] || "未命名方案"}
                  stroke={COLORS[index % COLORS.length]}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
