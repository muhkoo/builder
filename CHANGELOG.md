# Changelog

All notable changes to the **Muhkoo App Builder** plugin. Pre-1.0: new
backward-compatible features bump the minor, fixes bump the patch.

## 0.2.0

### Added

- **Hosting.** Every app gets a DNS subdomain `https://<slug>.apps.muhkoo.dev`. The
  starter template ships `scripts/deploy.mjs` (content-addressed, dedup, instant +
  rollback-able) and a `.github/workflows/deploy.yml` for push-to-deploy CI/CD;
  `provision.mjs` surfaces each app's hosting URL. New `references/hosting.md` + SKILL
  step 7.
- **Live Cypress E2E suite** in the template — drives the *real* backend (ZK
  register/login, database CRUD, the encrypted channel round-trip) via `npm run
  test:e2e`. `data-cy` hooks on every component; `cy.signUp()` support command.
- **Frontend-design pass.** The workflow invokes the `frontend-design` skill to give
  each app a distinctive look, under a preservation contract (keeps the test hooks +
  SDK wiring intact). See `references/design.md`.
- **Responsive design is a requirement** — every app is usable from ~360px to desktop;
  gated by `cypress/e2e/04-responsive.cy.ts` (mobile viewport, no horizontal overflow).
- **Agent prompt ejection** improved upstream (`@muhkoo/connect` 0.6.0-alpha.1): ejected
  prompts now compel a closing reply after tool use (no more silent agents).

### Changed

- Self-hosting plugin **marketplace** (`/plugin marketplace add muhkoo/builder` →
  `/plugin install muhkoo-app-builder@muhkoo`).
- Template install uses `npm install --install-links` for a `file:` `@muhkoo/connect`
  dep (copies instead of symlinks — keeps the build working).

## 0.1.x

- Initial plugin: describe an app idea → provision the backend (app key, DB tables,
  channels, agents, serverless functions) → scaffold a Vite + React + `@muhkoo/connect`
  client. `provision.mjs`, `eject-agent.mjs`, the starter template, and the worked
  `task-board` example.
