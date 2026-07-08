// nitro's cloudflare-module preset defaults `no_bundle: true`, which tells
// wrangler to deploy the already-split .mjs chunks nitro/rolldown produced
// as-is, without re-bundling them into one file. Under workerd's ES module
// loader, a CJS-interop helper (`__commonJSMin`) that's defined in one chunk
// and imported live-binding-style from another isn't always initialized
// before a dependent chunk calls it, throwing:
//   TypeError: __commonJSMin is not a function
// (same root cause as https://github.com/withastro/astro/issues/16029 — a
// Vite 8/rolldown + Cloudflare Workers module-splitting issue, not anything
// specific to this app).
//
// The `@lovable.dev/vite-tanstack-config` wrapper doesn't expose a typed way
// to override `cloudflare.wrangler.no_bundle`, so we patch the generated
// wrangler.json after build instead. Setting `no_bundle: false` makes
// wrangler's own esbuild bundler fold everything into a single index.js at
// deploy time, which resolves the interop correctly (verified locally: this
// produces one consolidated ~2MB bundle instead of several linked chunks).
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const path = join(process.cwd(), ".output/server/wrangler.json");
const config = JSON.parse(readFileSync(path, "utf8"));
config.no_bundle = false;
writeFileSync(path, JSON.stringify(config, null, 2) + "\n");
console.log("[patch-wrangler-config] set no_bundle: false in", path);
