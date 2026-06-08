import { defineConfig } from "cypress";

/**
 * Cypress E2E config. The specs run against the dev server (`npm run dev` on
 * :5173), which talks to your real Muhkoo Accelerator app (the API base + app
 * key in `.env.local`). So these are true end-to-end tests: in-browser ZK auth,
 * the database, and the realtime channel against the live backend.
 *
 * ZK proof generation runs snarkjs + WASM in the browser — several seconds per
 * register/login — so the timeouts are generous.
 */
export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5173",
    defaultCommandTimeout: 15_000,
    viewportWidth: 1280,
    viewportHeight: 800,
    video: false,
    screenshotOnRunFailure: false,
    specPattern: "cypress/e2e/**/*.cy.ts",
  },
});
