import { defineConfig } from "vite";

/**
 * Vite config for a statically-hosted Muhkoo site.
 *
 * Unlike the full app template, a static site needs NO ZK / wasm / polyfill
 * plugins — it ships no `@muhkoo/connect` auth and runs no snarkjs in the
 * browser. `vite build` emits hashed asset filenames into `dist/`, which Muhkoo
 * hosting serves with immutable caching (and `index.html` revalidated each load).
 *
 * Add more pages as extra Rollup inputs, e.g.:
 *   build: { rollupOptions: { input: { main: "index.html", about: "about.html" } } }
 */
export default defineConfig({
  build: { target: "esnext" },
  server: { port: 5173 },
});
