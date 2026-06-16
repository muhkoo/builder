# Changelog

All notable changes to the **Muhkoo App Builder** plugin. Pre-1.0: new
backward-compatible features bump the minor, fixes bump the patch.

## 0.2.6

### Added

- **Scaffold wires "Account & security" into the app header** — generated apps
  get an **Account** button that opens centralized account management on
  `auth.muhkoo.dev/security` via `client.auth.hosted.manageAccount({ returnUri })`.
  One place to manage passkeys, recovery email, Google, recovery phrase, and the
  password — across every Muhkoo app, with no per-app security UI to maintain.
  `AuthContext` exposes `manageAccount()`.

### Changed

- Template `@muhkoo/connect` pinned to `^0.7.0-alpha.4` (hosted auth +
  `manageAccount`). New apps need that published SDK version.

## 0.2.5

### Changed

- **Scaffold now uses centralized hosted auth (`client.auth.hosted`).** Generated
  apps no longer embed a login/register/recovery UI or the proving circuits —
  the `AuthScreen` is a single **"Continue with Muhkoo"** button that redirects to
  the hosted sign-in page (auth.muhkoo.dev) and returns with a session via
  `handleCallback()`. This drops ~6 MiB (snarkjs) from the app bundle and means
  every factor (password, passkey, email, Google) and account recovery are
  managed in one place — so "Sign in with Google" works with no per-app OAuth
  origin setup. The `AuthContext`, `AuthScreen`, `lib/client`, and `lib/config`
  templates were rewritten; `SecurityDialog` was removed (factor management now
  lives on the hosted page).
- **Register your callback URL** in the developer portal (App Detail → Hosted
  sign-in) before deploying — the scaffold writes `VITE_MUHKOO_APP_ID`; the
  callback URL is the app's own origin.
- Docs/scaffolds updated: new `scaffolds/api-auth-hosted.md`, `references/platform.md`
  `client.auth.hosted` methods, and `SKILL.md` step notes. Product copy across the
  scaffold + docs no longer names the underlying infrastructure (it's "Muhkoo
  hosting" / "the platform").

## 0.2.4

### Added

- **Account recovery (Auth & Identity M1).** Targets `@muhkoo/connect` 0.6.0-alpha.11, where
  the password becomes a recovery **factor** rather than the source of keys: a random master
  seed (same `commitment`, backward-compatible) is wrapped per factor in a server-blind vault,
  making accounts un-lose-able. Documented across the skill:
  - **`references/platform.md`** — the `client.auth.zk` surface now lists `enrollPasskey`,
    `loginWithPasskey`, `passkeyAvailable`, `passkeyPrfAvailable`, `enrollRecoveryPhrase`,
    `recoverWithPhrase`, `changePassword`, `listFactors`, `removeFactor`, the `seedBase64`
    getter, and the exported `VaultUnavailableError`, plus a note to wrap per-user encrypted
    app-data under the seed (not the password). Bumped the documented SDK version to
    0.6.0-alpha.11.
  - **`scaffolds/api-auth.md`** — new *Account recovery & passkeys* section (passkey enroll +
    PRF-gated passwordless login, recovery phrase, change password, list/remove factors) in the
    applied-pattern + gotchas style; a *wrap app data to the seed, not the password* gotcha with
    the `seedBase64` pattern and the one-time password→seed re-wrap migration (REQUIRED when an
    app encrypts per-user data); and a note that `VaultUnavailableError` means "retry", not
    "wrong password".
  - **`references/design-guide.md`** — every app should ship a **Security** screen (passkey +
    recovery phrase + change password) and a **Forgot password** screen.
  - **Starter template** — `AuthContext` exposes the full recovery surface; `AuthScreen` adds a
    PRF-gated "Sign in with a passkey" button and a forgot-password (recover-with-phrase) flow;
    new `SecurityDialog` (enroll passkey, generate one-time recovery phrase, change password,
    view/remove factors) reachable from a Security button in the app bar.

## 0.2.3

### Added

- **Custom domains.** `references/hosting.md` + SKILL step 7 now cover serving an app on
  the developer's **own domain** (Cloudflare for SaaS): add it in the portal's *Custom
  domains* card, drop two CNAMEs at any DNS provider, and — once Cloudflare **verifies
  ownership** — it auto-issues + auto-renews the cert and starts serving (an unverified
  domain is never served). Paid-plan feature; includes the grey-cloud gotcha for domains
  already on the user's own Cloudflare account.
- **Hosting release history.** Documented the last-10 release retention + delete, and the
  `DELETE /hosting/releases/:releaseId` endpoint.

## 0.2.2

### Added

- **Scaffold ejection** (`references/extracting-scaffolds.md`) — harvest a reusable
  scaffold from a finished build so the next app starts ahead.

## 0.2.1

### Fixed

- **`provision.mjs` re-deploys are idempotent.** Deploying an agent or function whose name
  already exists now PATCHes (updates/redeploys) it instead of failing with a 409 — so
  re-running provision against an existing app updates rather than erroring.

### Added

- **Scaffolds** — a per-`@muhkoo/connect`-API blueprint library (`scaffolds/api-*.md`) with
  the applied pattern + gotchas distilled from real apps (web, discord-clone, standup), plus
  capability scaffolds (`pwa.md` — installable PWA + safe-area handling). The baseline app bar
  now respects `env(safe-area-inset-top)` so PWAs clear the notch.

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
