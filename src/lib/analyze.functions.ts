import { createServerFn } from "@tanstack/react-start";

export interface AnalyzeInput {
  title: string;
  context: string;
  series: { name: string; points: { x: string | number; y: number }[] }[];
}

export interface AnalyzeResult {
  analysis: string;
}

export const analyzeTrend = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): AnalyzeInput => {
    const d = data as AnalyzeInput;
    if (!d || typeof d.title !== "string" || !Array.isArray(d.series)) {
      throw new Error("Invalid analyze payload");
    }
    return d;
  })
  .handler(async ({ data }): Promise<AnalyzeResult> => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    // Down-sample if too many points to keep prompt compact
    const compactSeries = data.series.map((s) => {
      const pts = s.points;
      const maxPts = 60;
      const step = Math.max(1, Math.ceil(pts.length / maxPts));
      const sampled = pts.filter((_, i) => i % step === 0 || i === pts.length - 1);
      return { name: s.name, points: sampled };
    });

    const dataText = compactSeries
      .map((s) => `## ${s.name}\n` + s.points.map((p) => `${p.x}: ${p.y}`).join("\n"))
      .join("\n\n");

    const prompt = `You are a data analyst reviewing Singapore transport statistics.

Dataset: ${data.title}
Context: ${data.context}

${dataText}

Write a trend analysis (250-400 words) in markdown with these sections:

### Trends
- Overall direction and magnitude of change per series.
- Notable inflection points, spikes, or dips (name the year/month).
- Comparison between series where meaningful.

### Hypotheses
Propose 2-4 hypotheses that could explain the observed patterns. Draw on
your knowledge of Singapore transport policy, COE history, economic events
(GFC 2008, COVID-19, chip shortage), LTA vehicle growth caps, ERP, taxi/
ride-hail dynamics, EV incentives, etc. For each hypothesis:
- State it clearly and tie it to a specific year/segment in the data.
- Rate confidence (low / medium / high).
- Where you rely on a known public source (LTA announcement, MOT statement,
  news reporting, academic paper), cite it inline as \`[source](https://...)\`
  using a real URL you are confident exists. Omit the link if unsure — do
  not fabricate URLs.

No preamble. Be specific with numbers and years.`;

    const models = (
      process.env.GEMINI_MODEL ?? "gemini-2.5-flash,gemini-2.0-flash,gemini-2.5-flash-lite"
    )
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);

    const callGemini = async (model: string) => {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [
                { text: "You are a precise data analyst. Be specific with numbers and years." },
              ],
            },
            contents: [{ role: "user", parts: [{ text: prompt }] }],
          }),
        },
      );
      return res;
    };

    let res: Response | undefined;
    let lastError: Error | undefined;
    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      res = await callGemini(model);
      if (res.ok) break;

      // Model overloaded — try the next fallback model rather than failing outright.
      if (res.status === 503 && i < models.length - 1) {
        lastError = new Error(`${model} unavailable (503), trying fallback model`);
        continue;
      }

      const body = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("Rate limit reached. Try again shortly.");
      if (res.status === 403) throw new Error("Gemini API key invalid or missing permissions.");
      if (res.status === 503)
        throw new Error("All Gemini models are currently overloaded. Please try again shortly.");
      throw new Error(`AI request failed (${res.status}): ${body.slice(0, 200)}`);
    }
    if (!res || !res.ok) {
      throw lastError ?? new Error("AI request failed for an unknown reason.");
    }

    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const analysis =
      json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ??
      "No analysis returned.";
    return { analysis };
  });
