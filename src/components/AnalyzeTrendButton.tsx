import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { analyzeTrend, type AnalyzeInput } from "@/lib/analyze.functions";

// Server functions need a live server to hit at request time. The GitHub Pages
// build (`npm run build:gh-pages`) sets VITE_AI_ANALYSIS=false because there's no
// server after a static export — see DEPLOY.md. Cloudflare deploys keep this on.
const AI_ANALYSIS_ENABLED = import.meta.env.VITE_AI_ANALYSIS !== "false";

interface Props {
  label?: string;
  buildPayload: () => AnalyzeInput;
}

function renderMarkdown(md: string): string {
  // Minimal markdown → HTML: headings, bold, bullets, paragraphs.
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = esc(md).split(/\r?\n/);
  const out: string[] = [];
  let inList = false;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^\s*[-*]\s+/.test(line)) {
      if (!inList) {
        out.push("<ul class='list-disc pl-5 space-y-1'>");
        inList = true;
      }
      out.push(`<li>${line.replace(/^\s*[-*]\s+/, "")}</li>`);
      continue;
    }
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
    if (!line.trim()) {
      out.push("");
      continue;
    }
    if (/^###\s+/.test(line))
      out.push(`<h3 class='mt-3 font-semibold'>${line.replace(/^###\s+/, "")}</h3>`);
    else if (/^##\s+/.test(line))
      out.push(`<h2 class='mt-3 font-semibold text-sm'>${line.replace(/^##\s+/, "")}</h2>`);
    else if (/^#\s+/.test(line))
      out.push(`<h2 class='mt-3 font-semibold'>${line.replace(/^#\s+/, "")}</h2>`);
    else out.push(`<p>${line}</p>`);
  }
  if (inList) out.push("</ul>");
  return out
    .join("\n")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code class='rounded bg-background px-1'>$1</code>");
}

export function AnalyzeTrendButton({ label = "✨ Analyse trend", buildPayload }: Props) {
  const run = useServerFn(analyzeTrend);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<string>("");
  const [title, setTitle] = useState<string>("");

  if (!AI_ANALYSIS_ENABLED) {
    return (
      <button
        type="button"
        disabled
        title="AI analysis needs a live server and isn't available on this static deployment."
        className="cursor-not-allowed rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground opacity-60"
      >
        {label} (unavailable on static hosting)
      </button>
    );
  }

  const onClick = async () => {
    setOpen(true);
    setLoading(true);
    setError("");
    setResult("");
    try {
      const payload = buildPayload();
      setTitle(payload.title);
      if (payload.series.length === 0 || payload.series.every((s) => s.points.length === 0)) {
        throw new Error(
          "No active data to analyse. Enable at least one series with data in range.",
        );
      }
      const res = await run({ data: payload });
      setResult(res.analysis);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        className="rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
      >
        {label}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => !loading && setOpen(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-xl border border-border bg-card p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">AI Trend Analysis</h3>
                <p className="text-xs text-muted-foreground">{title}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                Close
              </button>
            </div>
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                Analysing active data…
              </div>
            )}
            {error && (
              <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                {error}
              </div>
            )}
            {result && (
              <div
                className="prose prose-invert prose-sm max-w-none space-y-2 text-sm leading-relaxed text-foreground"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(result) }}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
