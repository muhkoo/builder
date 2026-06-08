import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import { nodePolyfills } from "vite-plugin-node-polyfills";

/**
 * Vite config for a Muhkoo app. The wasm / top-level-await / node-polyfills
 * plugins are required because Muhkoo's ZK auth runs snarkjs + circomlibjs in
 * the browser (they need WebAssembly, top-level `await`, and Node's `Buffer`).
 *
 * The app talks to the API at `VITE_WORKER_URL` (see `.env.local`). The SDK
 * derives every endpoint — REST, WebSocket, ZK circuit assets — from that one
 * base URL, and the app's CORS allowlist (`*` by default) lets localhost in.
 *
 * NOTE: install with `npm install --install-links` so the `file:` @muhkoo/connect
 * dependency is COPIED (not symlinked). The SDK's browser build imports the
 * node-polyfill shims by bare specifier; with a symlink the bundler resolves
 * them from the SDK's realpath and the build/dev server break.
 */
export default defineConfig({
  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
    nodePolyfills({
      include: ["buffer", "process", "util", "stream"],
      globals: { Buffer: true, process: true, global: true },
    }),
  ],
  optimizeDeps: { include: ["snarkjs", "circomlibjs"] },
  build: { target: "esnext" },
  server: { port: 5173 },
});
