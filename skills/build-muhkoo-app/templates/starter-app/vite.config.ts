import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";
import { nodePolyfills } from "vite-plugin-node-polyfills";

/**
 * Vite config for a Muhkoo app. The wasm and node-polyfills plugins are
 * required because the SDK's sign-in crypto runs snarkjs + circomlibjs in the
 * browser (they need WebAssembly and Node's `Buffer`). Top-level `await` needs
 * no plugin: `build.target: "esnext"` keeps it native (every current browser
 * runs it). The app-builder dropped vite-plugin-top-level-await in 0.4.0: its
 * 1.6.0 breaks the production build under @swc/core 1.16 ("missing field
 * `type`").
 *
 * The app talks to the API at `VITE_WORKER_URL` (see `.env.local`). The SDK
 * derives every endpoint — REST, WebSocket, ZK circuit assets — from that one
 * base URL, and the app's CORS allowlist (`*` by default) lets localhost in.
 *
 * NOTE: with the npm release of @muhkoo/connect a plain `npm install` is fine. If
 * you point it at a local checkout (`file:`), install with
 * `npm install --install-links` so the SDK is COPIED (not symlinked). The
 * SDK's browser build imports the node-polyfill shims by bare specifier; with a
 * symlink the bundler resolves them from the SDK's realpath and the build/dev
 * server break.
 */
export default defineConfig({
  plugins: [
    react(),
    wasm(),
    nodePolyfills({
      include: ["buffer", "process", "util", "stream"],
      globals: { Buffer: true, process: true, global: true },
    }),
  ],
  optimizeDeps: { include: ["snarkjs", "circomlibjs"] },
  build: { target: "esnext" },
  server: { port: 5173 },
});
