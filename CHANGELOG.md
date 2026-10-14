# Changelog

All notable changes to the **Muhkoo App Builder** plugin. Pre-1.0: new
backward-compatible features bump the minor, fixes bump the patch.

## 0.4.0 — 2026-10-13

Brings the plugin in line with `@muhkoo/connect` 0.15.0-alpha.5 and the platform's
paid-only and past-due behaviour.

### Added

- **Payment refusals in the starter app.** A write refused for payment (the app is
  "Paid Muhkoo accounts only" and the user is on Free, or a payment is past due) now
  shows a notice instead of a raw error. One helper, `src/lib/paymentErrors.ts`, maps
  the SDK's `PaymentRequiredError` codes: `user_plan_required` → "This app needs a paid
  Muhkoo plan." + Upgrade link; `user_payment_past_due` → "Your Muhkoo payment is past
  due — update your payment method." + link; `owner_payment_past_due` → "This app can't
  save changes right now." with no action. Links are only ever absolute http(s) URLs.
  `RecordsBoard` (load, add, toggle, delete — toggle and delete had no error handling)
  and `ChannelChat` (channel setup, send) use it, through a new `NoticeAlert` component.
- **Access banner.** `AuthContext` calls `client.app.access()` after sign-in and each
  time the tab becomes visible again, failing open (a 404 from an older server, or any
  error, counts as allowed). A refusal shows a warning banner with the upgrade link in
  the app shell (`data-cy="access-banner"`).
- **`scaffolds/api-payments.md`** — the pattern above, plus the gotchas: which 402s are
  and aren't `PaymentRequiredError`, live-socket sends not surfaced, the offline queue
  keeping refused writes (`SYNC_ERROR` with `dropped: false`, `queue.waiting()`,
  `offline.resume()`), and never calling `access()` from `SYNC_COMPLETE`.
- **`references/platform.md` → "Payments & access"**: `PaymentRequiredError` and its
  codes, `client.app.access()`, the offline-queue behaviour, and where the owner's
  paid-only switch lives (portal → the app → Deploy tab; not a provision-spec field).

### Changed

- **Template depends on `@muhkoo/connect` `^0.15.0-alpha.5`** (was `^0.7.0-alpha.4`).
  `SKILL.md` step 4 now treats the published npm release as the default; a `file:`
  checkout (with `npm install --install-links`) is only for SDK development.
- **Sign-out sticks.** After the app's own sign-out, the next "Continue with Muhkoo"
  passes `prompt: "login"`, so a browser remembered with "Keep me signed in" doesn't
  sign the user straight back in. The flag survives a reload and clears on the next
  completed sign-in. `scaffolds/api-auth-hosted.md` documents this and the "Continue
  as …" screen.
- **Dropped `vite-plugin-top-level-await` from the starter.** Its latest release
  (1.6.0) fails the production build under `@swc/core` 1.16 ("missing field `type`"),
  which a fresh install now pulls. `build.target: "esnext"` keeps top-level `await`
  native, so the plugin isn't needed.
- `references/platform.md`: current SDK version, the full namespace list (`vfs`, `vcs`,
  `trust`, `accessTokens`, `app`, `offline`), `ClientOptions`, hosted-login `prompt` /
  `returnTo`, and signed private channels.
- Wording: "ZK auth" → hosted sign-in ("Continue with Muhkoo") in the skill
  description, `SKILL.md`, `README.md`, the marketplace entry and the plugin keywords;
  `scaffolds/api-auth.md` now opens with a "prefer hosted sign-in" note.
- A 402 can now also be a payment refusal, not just a tier limit: noted in `SKILL.md`
  step 3, `scaffolds/api-agents.md` and `scaffolds/api-functions.md`
  (`client.functions.invoke` returns the raw `Response`, so check the `code` yourself).
- `references/provisioning.md`: the paid-only switch is a portal toggle.
- `README.md`: layout tree lists `scaffolds/` and both templates under
  `skills/build-muhkoo-app/templates/`, and the scripts line names
  `extract-scaffold.mjs` (the provisioning scripts were removed in 0.3.0); the custom
  domain line no longer names the infrastructure provider. Starter `README.md`
  install, structure and deploy sections updated to match.

## 0.3.0

### Changed

- **Adopted the `@muhkoo/cli` everywhere.** Login, provisioning, agent eject, and
  hosting deploys now run through the `muhkoo` CLI instead of bundled scripts:
  - `SKILL.md` and the references (`provisioning.md`, `hosting.md`, `platform.md`,
    `decorators.md`) use `muhkoo login` / `muhkoo provision` / `muhkoo eject` /
    `muhkoo deploy`.
  - Both templates' `package.json` deploy scripts and CI workflows call
    `npx -y @muhkoo/cli deploy`.
  - Removed the bundled `provision.mjs`, `eject-agent.mjs`, `_eject-runner.ts`, and
    the templates' `deploy.mjs` (kept `extract-scaffold.mjs`). Requires
    `@muhkoo/cli` (on npm).

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
