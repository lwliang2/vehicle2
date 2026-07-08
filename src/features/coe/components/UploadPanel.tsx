import { memo, useState, type ChangeEvent } from "react";
import { parseCoeCsv } from "../csv";
import type { UploadMode, UploadState } from "../types";

interface Props {
  upload: UploadState | null;
  onChange: (u: UploadState | null) => void;
  baseCount: number;
}

export const UploadPanel = memo(function UploadPanel({ upload, onChange, baseCount }: Props) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<UploadMode>("replace");
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [filename, setFilename] = useState("pasted.csv");

  const apply = (raw: string, name: string) => {
    const { records, errors } = parseCoeCsv(raw);
    if (errors.length) {
      setStatus({ kind: "err", msg: errors.slice(0, 3).join(" · ") });
      return;
    }
    onChange({ records, mode, filename: name, uploadedAt: Date.now() });
    setStatus({
      kind: "ok",
      msg: `Loaded ${records.length.toLocaleString()} rows from ${name} (${mode}).`,
    });
  };

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setStatus({ kind: "err", msg: "File too large (max 5 MB)." });
      return;
    }
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result ?? "");
      setText(raw.slice(0, 20000));
      apply(raw, file.name);
    };
    reader.onerror = () => setStatus({ kind: "err", msg: "Could not read file." });
    reader.readAsText(file);
  };

  const applyPasted = () => {
    if (!text.trim()) {
      setStatus({ kind: "err", msg: "Paste CSV content first." });
      return;
    }
    apply(text, filename || "pasted.csv");
  };

  const reset = () => {
    onChange(null);
    setStatus({ kind: "ok", msg: "Reverted to live data.gov.sg data." });
  };

  return (
    <details className="rounded-xl border border-border bg-card">
      <summary className="cursor-pointer list-none px-5 py-4 text-sm text-muted-foreground transition-colors hover:text-foreground">
        📥 Upload CSV to override or merge data
        {upload && (
          <span className="ml-2 rounded-full bg-primary/20 px-2 py-0.5 text-[0.65rem] font-semibold text-primary">
            {upload.mode} · {upload.records.length.toLocaleString()} rows
          </span>
        )}
      </summary>
      <div className="space-y-4 border-t border-border p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-[0.65rem] uppercase tracking-wider text-muted-foreground">
              Upload file
            </label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={onFile}
              className="block w-full text-xs text-muted-foreground file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>
          <div>
            <label className="mb-1 block text-[0.65rem] uppercase tracking-wider text-muted-foreground">
              Mode
            </label>
            <div className="flex gap-1">
              {(["replace", "merge"] as UploadMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={
                    "flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors " +
                    (mode === m
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-muted-foreground")
                  }
                >
                  {m === "replace" ? "Replace all" : `Merge (${baseCount.toLocaleString()} base)`}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[0.65rem] uppercase tracking-wider text-muted-foreground">
            …or paste CSV
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 500000))}
            placeholder="month,bidding_no,vehicle_class,quota,bids_success,bids_received,premium&#10;2025-09,1,Category A,1000,995,1420,95000"
            className="h-28 w-full rounded-md border border-border bg-background p-2 font-mono text-[0.7rem] outline-none focus:border-muted-foreground"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={applyPasted}
            className="rounded-md bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Apply pasted CSV
          </button>
          {upload && (
            <button
              type="button"
              onClick={reset}
              className="rounded-md border border-border bg-background px-4 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              Revert to live data
            </button>
          )}
        </div>

        {status && (
          <div
            className={
              "rounded-md border px-3 py-2 text-xs " +
              (status.kind === "ok"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-rose-500/30 bg-rose-500/10 text-rose-300")
            }
          >
            {status.msg}
          </div>
        )}

        <p className="text-[0.7rem] leading-relaxed text-muted-foreground">
          Expected header:{" "}
          <code className="rounded bg-background px-1 py-0.5 text-[0.65rem]">
            month,bidding_no,vehicle_class,quota,bids_success,bids_received,premium
          </code>
          . Only <code>month</code>, <code>vehicle_class</code>, <code>quota</code>, and{" "}
          <code>premium</code> are required. Replace swaps the entire dataset; merge overlays your
          rows onto the live data by month + exercise + category.
        </p>
      </div>
    </details>
  );
});
