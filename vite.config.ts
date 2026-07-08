// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
//
// Deploy targets (see DEPLOY.md for full instructions):
//   - Cloudflare Workers (default): `npm run build` — nitro defaults to the cloudflare-module
//     preset already. `npm run deploy:cloudflare` builds and runs `wrangler deploy`.
//   - GitHub Pages (static export, no server functions at runtime):
//     `npm run build:gh-pages` sets NITRO_PRESET=github-pages (a built-in Nitro preset that
//     prerenders every route to static HTML/JSON, writes .nojekyll, and needs no Node server).
//     BASE_PATH must match your repo name for project sites, e.g. BASE_PATH=/my-repo/.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const basePath = process.env.BASE_PATH || "/";

export default defineConfig({
  vite: {
    base: basePath,
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
