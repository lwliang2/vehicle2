# Deploying COE Insights

## Cloudflare Workers (recommended — fully supported)

This template already targets Cloudflare by default (`nitro`'s `cloudflare-module`
preset), so this path gets the full app: live data.gov.sg fetching and the AI
"Analyse trend" feature both run as server functions on the Worker.

### One-time setup

```bash
npm install
npx wrangler login          # opens a browser to authorize this machine
npx wrangler secret put GEMINI_API_KEY   # paste your Google AI Studio key when prompted
```

`GEMINI_API_KEY` is required for the "Analyse trend" button — get a free one at
https://aistudio.google.com/apikey. `COE_RESOURCE_ID`
is optional (defaults to the live data.gov.sg COE resource) — set it the same
way with `wrangler secret put COE_RESOURCE_ID` only if you need to override it.

### Deploy

```bash
npm run deploy:cloudflare
```

This runs `vite build` (nitro auto-generates `.output/server/wrangler.json`
with a worker name from `package.json`'s `name` field) and then
`nitro deploy --prebuilt`, which shells out to `wrangler deploy` using that
generated config. Your site will be live at `https://coe-insights.<your-subdomain>.workers.dev`
(or a custom domain you attach in the Cloudflare dashboard).

### Automatic deploys from GitHub

A workflow is included at `.github/workflows/deploy-cloudflare.yml` — it
builds and deploys on every push to `main`. Add these two repo secrets under
**Settings → Secrets and variables → Actions**:

- `CLOUDFLARE_API_TOKEN` — create one at
  https://dash.cloudflare.com/profile/api-tokens using the "Edit Cloudflare Workers"
  template
- `CLOUDFLARE_ACCOUNT_ID` — found on the right sidebar of any page in the
  Cloudflare dashboard

Push to `main` and it deploys automatically.

---

## GitHub Pages — currently blocked upstream, needs a decision

GitHub Pages only serves static files — there's no server, so the two
server functions (`fetchCoeResults`, `analyzeTrend` in `src/lib/`) can't run
there as-is. TanStack Start / Nitro do ship a `github-pages` preset meant for
exactly this (prerenders every route to static HTML at build time, no server
needed afterward), so in principle:

```bash
NITRO_PRESET=github-pages BASE_PATH=/coe-insights/ npm run build
```

should produce a fully static `.output/public/` folder deployable straight to
GitHub Pages. **I tried this and it fails** — with this project's current
`nitro` version (`3.0.260603-beta`) combined with Vite 8's rolldown bundler,
the prerender step crashes with:

```
rolldownOptions.input should not be an html file when building for SSR.
```

This reproduces on a clean build with no other changes, and isn't something I
can fix from application code — it's an incompatibility between this beta
`nitro` release and TanStack Start's SSR-oriented build pipeline. I couldn't
pin an older stable `nitro` (`3.0.0`) either, since `@lovable.dev/vite-tanstack-config`
pins a peer-dependency range that only accepts this beta line.

**Options, if you still want GitHub Pages:**

1. **Wait and retry** — file/watch for this against `nitro`'s releases; a
   newer beta may fix it, and it's a one-line preset change once it does.
2. **I build a separate static SPA** for the GitHub Pages target: drop
   `@tanstack/react-start`'s SSR pipeline for that build, use plain
   `@tanstack/react-router` (client-rendered only) with a hand-written
   `index.html`, fetch COE data directly from the browser (data.gov.sg is a
   public, unauthenticated API), and either disable the AI analysis button
   on that build or point it at your Cloudflare deployment's URL. This is a
   real second build target, not a config flag — a few hours of additional
   work, and the two deployments would drift slightly over time since they'd
   share route/UI code but not the data-fetching layer.
3. **Skip GitHub Pages** — Cloudflare Workers' free tier (100k requests/day)
   covers this app comfortably, and you keep every feature working.

Let me know which you'd like and I'll continue from there.
