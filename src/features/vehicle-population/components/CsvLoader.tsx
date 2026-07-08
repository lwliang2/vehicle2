import { memo, useState, type ChangeEvent } from "react";

interface Props {
  rowsCount: number;
  onApply: (text: string) => string;
  onClear: () => string;
}

export const CsvLoader = memo(function CsvLoader({ rowsCount, onApply, onClear }: Props) {
  const [csvText, setCsvText] = useState("");
  const [applyMsg, setApplyMsg] = useState("");

  const applyCsv = () => setApplyMsg(onApply(csvText));

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setCsvText(text);
      setApplyMsg(onApply(text));
    };
    reader.readAsText(file);
  };

  const clearData = () => {
    setCsvText("");
    setApplyMsg(onClear());
  };

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <details open={rowsCount === 0}>
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
          Load / replace CSV data
        </summary>
        <div className="mt-3 space-y-3 text-sm">
          <p className="text-xs text-muted-foreground">
            1. Download the latest Vehicle Population CSV from{" "}
            <a
              href="https://datamall.lta.gov.sg/content/datamall/en/static-data.html"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline"
            >
              LTA Datamall
            </a>
            .
          </p>
          <p className="text-xs text-muted-foreground">
            2. Paste the CSV or upload a file. Accepts wide format (one row per year) or LTA's long
            format (Year, Category, Type, Number).
          </p>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={onFile}
            className="block w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground file:mr-2 file:rounded file:border-0 file:bg-primary file:px-2 file:py-1 file:text-xs file:text-primary-foreground"
          />
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="Year,Private Cars,Company Cars,..."
            className="h-36 w-full resize-y rounded-md border border-border bg-background p-2 font-mono text-xs"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={applyCsv}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              Apply CSV
            </button>
            {rowsCount > 0 && (
              <button
                type="button"
                onClick={clearData}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-muted-foreground"
              >
                Clear data
              </button>
            )}
            {applyMsg && <span className="text-xs text-muted-foreground">{applyMsg}</span>}
          </div>
        </div>
      </details>
    </section>
  );
});
