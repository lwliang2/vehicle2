import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { triggerLtaSync } from "@/lib/lta-sync.functions";

const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes — a soft deterrent against
// spam-clicking, not a real rate limit. It resets on page reload, since
// there's no server-side state to check it against; GitHub's own API rate
// limits are the real backstop against abuse.

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; runUrl: string | null }
  | { kind: "error"; message: string };

export function CheckLtaUpdatesButton() {
  const run = useServerFn(triggerLtaSync);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (cooldownUntil == null) return;
    timerRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cooldownUntil]);

  const onClick = async () => {
    setStatus({ kind: "loading" });
    try {
      const result = await run();
      setStatus({ kind: "success", runUrl: result.runUrl });
      setCooldownUntil(Date.now() + COOLDOWN_MS);
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "Sync failed." });
    }
  };

  const remainingMs = cooldownUntil != null ? cooldownUntil - now : 0;
  const onCooldown = remainingMs > 0;
  const disabled = status.kind === "loading" || onCooldown;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title="Triggers the same monthly sync early — LTA Datamall → GitHub Actions → redeploy, usually a few minutes"
        className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status.kind === "loading"
          ? "Triggering…"
          : onCooldown
            ? `🔄 Check for updates (${Math.ceil(remainingMs / 1000)}s)`
            : "🔄 Check for updates"}
      </button>
      {status.kind === "success" && (
        <span className="text-xs text-muted-foreground">
          Sync triggered — results in a few minutes.
          {status.runUrl && (
            <>
              {" "}
              <a
                href={status.runUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline"
              >
                View run ↗
              </a>
            </>
          )}
        </span>
      )}
      {status.kind === "error" && (
        <span className="text-xs text-rose-400" title={status.message}>
          {status.message}
        </span>
      )}
    </div>
  );
}
