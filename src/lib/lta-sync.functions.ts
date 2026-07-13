import { createServerFn } from "@tanstack/react-start";

interface TriggerResult {
  triggeredAt: string;
  runUrl: string | null;
}

// Triggers the same monthly sync workflow (.github/workflows/sync-lta-data.yml)
// on demand via GitHub's workflow_dispatch API, rather than waiting for the
// schedule. The actual download/merge/commit still happens in GitHub Actions
// (this Worker has no writable filesystem or git access), so results land a
// few minutes later once that workflow finishes and Cloudflare redeploys —
// this just kicks it off early.
export const triggerLtaSync = createServerFn({ method: "POST" }).handler(
  async (): Promise<TriggerResult> => {
    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO; // "owner/repo", e.g. "lwliang2/vehicle2"
    if (!token || !repo) {
      throw new Error(
        "GITHUB_TOKEN and/or GITHUB_REPO not configured on this deployment — see DEPLOY.md.",
      );
    }

    const url = `https://api.github.com/repos/${repo}/actions/workflows/sync-lta-data.yml/dispatches`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "coe-insights-app",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref: "main", return_run_details: true }),
    });

    if (res.status === 401 || res.status === 403) {
      throw new Error(
        "GitHub rejected the request (invalid or under-scoped GITHUB_TOKEN). It needs " +
          '"Actions: write" permission on this repo.',
      );
    }
    if (res.status === 404) {
      throw new Error(
        "Workflow or repo not found — check GITHUB_REPO matches owner/repo exactly, and that " +
          "sync-lta-data.yml exists on the default branch.",
      );
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`GitHub API error (${res.status}): ${body.slice(0, 200)}`);
    }

    let runUrl: string | null = null;
    if (res.status === 200) {
      const json = (await res.json().catch(() => null)) as { html_url?: string } | null;
      runUrl = json?.html_url ?? null;
    }

    return { triggeredAt: new Date().toISOString(), runUrl };
  },
);
