"use client";

import React, { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { FileText, KeyRound, Loader2, Paperclip, RotateCcw, UploadCloud, X } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { analyzeFiles } from "@/lib/api";
import { buildTrendData, currency } from "@/lib/analysis";
import type { AnalysisResult } from "@/lib/types";

const COLORS = ["#8f5d46", "#4f6358", "#b4764f", "#2f4b57", "#756052", "#9b6f5d"];

type Credentials = {
  apiKey: string;
};

export default function Dashboard() {
  const [files, setFiles] = useState<File[]>([]);
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<AnalysisResult[]>([]);

  const cashValueTrend = useMemo(() => buildTrendData(results, "cashValueTrend"), [results]);
  const irrTrend = useMemo(() => buildTrendData(results, "irrTrend"), [results]);
  const credentials = { apiKey };

  const appendFiles = (incoming: File[]) => {
    setError("");
    setFiles((current) => [...current, ...incoming]);
  };

  const removeFile = (index: number) => {
    setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const startAnalysis = async () => {
    if (!files.length) {
      setError("Upload a proposal file before starting the analysis.");
      return;
    }
    if (!apiKey.trim()) {
      setError("Enter your own LLM API key before starting the analysis.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const nextResults = await analyzeFiles(files, {
        apiKey: apiKey.trim(),
      });
      setResults(nextResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed. Check the API service and environment configuration.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFiles([]);
    setApiKey("");
    setError("");
    setResults([]);
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#f7f4ee] text-[#171512]">
      <Header onReset={reset} />

      <main className="grid min-h-[calc(100vh-88px)] grid-cols-1 lg:grid-cols-2">
        <section className="flex items-start justify-center px-6 pb-10 pt-10 sm:px-10 sm:pt-12 lg:px-14 lg:pt-20">
          <div className="w-full max-w-[660px]">
            <HeroCopy />
            <UploadPanel
              files={files}
              credentials={credentials}
              loading={loading}
              error={error}
              onFilesAdded={appendFiles}
              onFileRemoved={removeFile}
              onApiKeyChange={setApiKey}
              onAnalyze={startAnalysis}
            />
          </div>
        </section>

        <section className="relative border-t border-[#ded8ce] bg-[#f3f0e8] px-5 py-8 lg:border-l lg:border-t-0 lg:px-9 lg:py-10">
          <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(#ded8ce_1px,transparent_1px),linear-gradient(90deg,#ded8ce_1px,transparent_1px)] [background-size:42px_42px]" />
          <AnalysisPreview results={results} cashValueTrend={cashValueTrend} irrTrend={irrTrend} loading={loading} />
        </section>
      </main>
    </div>
  );
}

function Header({ onReset }: { onReset: () => void }) {
  return (
    <header className="relative z-20 flex h-[88px] items-center justify-between px-6 sm:px-10 lg:px-12">
      <div className="flex items-center gap-3">
        <span className="font-serif text-4xl tracking-[-0.03em] text-[#171512]">InsureLens</span>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#d9d2c6] bg-[#fbfaf7] px-4 text-sm font-medium text-[#2b2925] shadow-sm transition hover:bg-white"
      >
        <RotateCcw className="h-4 w-4" />
        Reset
      </button>
    </header>
  );
}

function HeroCopy() {
  return (
    <div className="mb-10 text-center">
      <h1 className="mx-auto max-w-[580px] font-serif text-[58px] leading-[0.98] tracking-[-0.055em] text-[#171512] sm:text-[74px] lg:text-[86px]">
        Read plans,
        <br />
        decide faster
      </h1>
      <p className="mx-auto mt-8 max-w-[520px] text-[18px] leading-7 text-[#4c4740] sm:text-[21px]">
        Upload an insurance proposal, add your API key, and turn dense policy pages into clear metrics and risk notes.
      </p>
    </div>
  );
}

function UploadPanel({
  files,
  credentials,
  loading,
  error,
  onFilesAdded,
  onFileRemoved,
  onApiKeyChange,
  onAnalyze,
}: {
  files: File[];
  credentials: Credentials;
  loading: boolean;
  error: string;
  onFilesAdded: (files: File[]) => void;
  onFileRemoved: (index: number) => void;
  onApiKeyChange: (value: string) => void;
  onAnalyze: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleBrowse = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) onFilesAdded(Array.from(event.target.files));
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    onFilesAdded(Array.from(event.dataTransfer.files));
  };

  return (
    <div className="mx-auto max-w-[560px] rounded-[32px] border border-[#ded8ce] bg-[#fbfaf7]/88 p-6 shadow-[0_28px_80px_rgba(68,55,40,0.10)] backdrop-blur sm:p-8">
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        accept=".pdf,.txt,.md,.json,application/pdf,text/plain"
        onChange={handleBrowse}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(event) => event.preventDefault()}
        className="group flex h-[68px] w-full items-center justify-center gap-3 rounded-2xl border border-[#d8d1c6] bg-[#fffdf9] px-5 text-[17px] font-semibold text-[#24211d] shadow-sm transition hover:border-[#c9bdb0] hover:bg-white"
      >
        <UploadCloud className="h-5 w-5 text-[#cc785c] transition group-hover:-translate-y-0.5" />
        Upload File
      </button>

      <div className="my-5 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.18em] text-[#80776b]">
        <span className="h-px flex-1 bg-[#e1dbd0]" />
        Workflow
        <span className="h-px flex-1 bg-[#e1dbd0]" />
      </div>

      <div className="space-y-3">
        <label className="relative block">
          <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b8174]" />
          <input
            className="h-16 w-full rounded-2xl border border-[#d8d1c6] bg-[#fffdf9] pl-11 pr-4 text-[17px] text-[#24211d] outline-none transition placeholder:text-[#92897d] focus:border-[#bda48f] focus:ring-4 focus:ring-[#d6bba2]/20"
            type="password"
            value={credentials.apiKey}
            onChange={(event) => onApiKeyChange(event.target.value)}
            placeholder="Add API"
            autoComplete="off"
          />
        </label>

        <button
          type="button"
          onClick={onAnalyze}
          disabled={loading}
          className="flex h-16 w-full items-center justify-center rounded-2xl bg-[#171512] text-[17px] font-semibold text-white shadow-[0_10px_24px_rgba(23,21,18,0.18)] transition hover:bg-[#28231f] disabled:cursor-not-allowed disabled:opacity-65"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing
            </span>
          ) : (
            "Start Analysis"
          )}
        </button>
      </div>

      {files.length > 0 && (
        <div className="mt-6 space-y-2">
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-xl border border-[#e3ddd3] bg-[#f7f3ec] px-3 py-2">
              <FileText className="h-4 w-4 shrink-0 text-[#8f5d46]" />
              <span className="min-w-0 flex-1 truncate text-sm text-[#4b453e]">{file.name}</span>
              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                className="rounded-md p-1 text-[#8d8276] hover:bg-[#ece5da] hover:text-[#8f3f2e]"
                onClick={() => onFileRemoved(index)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="mt-4 rounded-xl border border-[#dfb7a8] bg-[#fff3ee] px-4 py-3 text-sm text-[#7a3b2c]">{error}</p>}

    </div>
  );
}

function AnalysisPreview({
  results,
  cashValueTrend,
  irrTrend,
  loading,
}: {
  results: AnalysisResult[];
  cashValueTrend: Array<Record<string, number | string | null>>;
  irrTrend: Array<Record<string, number | string | null>>;
  loading: boolean;
}) {
  return (
    <div className="relative z-10 mx-auto max-w-[850px] rounded-[28px] border border-[#d8d0c3] bg-[#ebe7dc]/86 p-4 shadow-[0_26px_80px_rgba(43,35,25,0.16)] backdrop-blur sm:p-6">
      <div className="rounded-[22px] border border-[#d6cec1] bg-[#f8f6f1]">
        <PreviewToolbar loading={loading} />
        <div className="space-y-4 p-4 sm:p-5">
          <MetricComparison results={results} />
          <TrendChart title="Cash Value Trend" data={cashValueTrend} results={results} />
          <TrendChart title="IRR Trend" data={irrTrend} results={results} unit="%" compact />
          <SummaryPanel results={results} />
        </div>
      </div>
    </div>
  );
}

function PreviewToolbar({ loading }: { loading: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-[#ded7cc] px-5 py-4">
      <div>
        <p className="text-sm font-semibold text-[#25221f]">Analysis Preview</p>
        <p className="mt-0.5 text-xs text-[#857b70]">Metrics, cash values, IRR, and plain-English notes</p>
      </div>
      <div className="inline-flex items-center gap-2 rounded-full border border-[#ddd5c8] bg-[#fffdf9] px-3 py-1.5 text-xs font-medium text-[#6d6258]">
        <span className={`h-2 w-2 rounded-full ${loading ? "animate-pulse bg-[#cc785c]" : "bg-[#798c73]"}`} />
        {loading ? "Running" : "Ready"}
      </div>
    </div>
  );
}

function MetricComparison({ results }: { results: AnalysisResult[] }) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const selected = results[selectedIndex] || results[0];
  const premium = selected?.["首年交多少"] || 0;
  const years = selected?.["交多久"] || 0;
  const latestCashValue = selected?.["现金价值"] || selected?.["利益演示表"]?.at(-1)?.cash_value;
  const latestIrr = selected?.irrTrend?.filter((value) => value !== null).at(-1);
  const metrics = [
    { label: "Annual Premium", value: selected ? currency(premium) : "--" },
    { label: "Total Premium", value: selected ? currency(selected["总保费"] || Number(premium) * Number(years)) : "--" },
    { label: "Cash Value", value: latestCashValue ? currency(latestCashValue) : "--" },
    { label: "Death Benefit", value: selected ? currency(selected["身故保障"] || selected["保多少"]) : "--" },
    { label: "Expected Return", value: selected?.["预期收益"] ? currency(selected["预期收益"]) : "--" },
    { label: "IRR", value: typeof latestIrr === "number" ? `${latestIrr.toFixed(2)}%` : "--" },
  ];

  return (
    <section className="rounded-2xl border border-[#ddd6cb] bg-[#fffdf9] p-4">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[#25221f]">Key Metrics</h2>
          <p className="mt-1 text-xs text-[#857b70]">
            {selected?.["产品名称"] || "Upload a proposal to generate comparable metrics."}
          </p>
        </div>
        <Paperclip className="mt-1 h-4 w-4 shrink-0 text-[#a09184]" />
      </div>

      {results.length > 1 && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {results.map((result, index) => {
            const active = index === selectedIndex;
            const name = result["产品名称"] || `Plan ${index + 1}`;

            return (
              <button
                key={`${name}-${index}`}
                type="button"
                onClick={() => setSelectedIndex(index)}
                className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold transition ${
                  active
                    ? "border-[#171512] bg-[#171512] text-white shadow-sm"
                    : "border-[#ded6cb] bg-[#f8f5ef] text-[#665c51] hover:border-[#c7baaa] hover:bg-white"
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-2xl bg-[#262a3b] px-4 py-5 text-white shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/58">{metric.label}</p>
            <p className="mt-3 font-serif text-3xl leading-none tracking-[-0.04em]">{metric.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TrendChart({
  title,
  data,
  results,
  unit,
  compact = false,
}: {
  title: string;
  data: Array<Record<string, number | string | null>>;
  results: AnalysisResult[];
  unit?: string;
  compact?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-[#ddd6cb] bg-[#fffdf9] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-[#25221f]">{title}</h2>
        <span className="text-xs text-[#8a8176]">{results.length ? `${results.length} plan${results.length > 1 ? "s" : ""}` : "Awaiting data"}</span>
      </div>
      <div className={compact ? "h-[210px]" : "h-[260px]"}>
        {results.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 18, left: 0, bottom: 6 }}>
              <CartesianGrid stroke="#e7e0d5" strokeDasharray="3 3" />
              <XAxis dataKey="year" tick={{ fill: "#766d62", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#ded6ca" }} />
              <YAxis unit={unit} tick={{ fill: "#766d62", fontSize: 11 }} tickLine={false} axisLine={false} width={48} />
              <Tooltip
                contentStyle={{
                  background: "#fffdf9",
                  border: "1px solid #d9d1c5",
                  borderRadius: 14,
                  color: "#25221f",
                }}
              />
              {results.map((result, index) => (
                <Line
                  key={`${title}-${result["产品名称"]}-${index}`}
                  type="monotone"
                  dataKey={result["产品名称"] || "Unnamed Plan"}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2.5}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-[#ded6ca] bg-[#faf8f3] text-center">
      <div>
        <p className="font-medium text-[#4b453e]">No chart data yet</p>
        <p className="mt-1 text-sm text-[#8a8176]">Results will appear after analysis completes.</p>
      </div>
    </div>
  );
}

function SummaryPanel({ results }: { results: AnalysisResult[] }) {
  return (
    <section className="rounded-2xl border border-[#ddd6cb] bg-[#fffdf9] p-4">
      <h2 className="text-base font-semibold text-[#25221f]">Advisor Notes</h2>
      {results.length === 0 ? (
        <p className="mt-3 text-sm leading-6 text-[#83796e]">Plain-language summaries and risk notes will be generated here.</p>
      ) : (
        <div className="mt-3 max-h-40 space-y-3 overflow-y-auto">
          {results.map((result, index) => (
            <div key={`${result["产品名称"]}-${index}`}>
              <p className="text-sm font-semibold text-[#8f5d46]">{result["产品名称"]}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#5a5249]">{result.summary}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
