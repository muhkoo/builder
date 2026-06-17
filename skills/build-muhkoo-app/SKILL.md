---
name: build-muhkoo-app
description: Build a complete application on the Muhkoo platform from a plain-language idea — design the data model, provision the backend (app key, database tables, channels, AI agents, serverless functions), and scaffold a working client. Two templates: a full Vite + React + @muhkoo/connect app with ZK auth, or a lightweight statically-hosted website (no auth/SDK, optional email-list function). Use when the user wants to build, scaffold, or prototype an app or static site on Muhkoo, or asks to "build me a … app on Muhkoo".
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, AskUserQuestion
---

# Build a Muhkoo app

Turn an app idea into a working application on [Muhkoo](https://muhkoo.dev): design
it, provision the backend, and scaffold a real client. The bundled `references/`,
`scripts/`, and `templates/` in this skill's directory are your toolkit — **read the
reference files as you go**, don't work from memory.

> Files referenced below (`references/…`, `scripts/…`, `templates/…`) are relative
> to this skill's directory. Resolve that directory once (it's where this SKILL.md
> lives) and use absolute paths when running scripts.

## What Muhkoo gives an app

ZK auth · a scalable database (`client.db`) · E2E-encrypted realtime channels
(`client.space`) · per-user KV + file storage · AI agents that can act on the app ·
serverless functions · **hosting** — every app gets a DNS subdomain
`https://<slug>.apps.muhkoo.dev` and can be deployed there (step 7). The SDK is
`@muhkoo/connect`. Full surface: [references/platform.md](references/platform.md).

## Choosing a template

Before designing, pick the template that fits the idea — they share the same
provisioning + hosting machinery, only the client differs:

- **`templates/starter-app`** (default) — a full Vite + React + `@muhkoo/connect`
  app with **ZK auth**, database, channels, agents. Use when users log in or the
  app has per-user data, realtime, or AI.
- **`templates/static-site`** — a lightweight **statically-hosted website**: plain
  HTML/CSS/JS (Vite), **no auth, no SDK, no ZK**. Use for landing pages, marketing
  sites, docs, portfolios — anything with no logged-in users. It can still call
  **one optional serverless function** (e.g. an email list — `functions/subscribe.js`).
  See the [static-site scaffold](scaffolds/static-site.md).

If unsure, ask (AskUserQuestion). Most of the workflow below assumes the full app;
the **Static websites** note under step 4 covers how the static path differs.

## Workflow

### 1 — Understand the idea

Restate what they want in one or two sentences. Ask **only** what's genuinely
unclear (use AskUserQuestion, ≤3 questions). Typical gaps: who logs in, what records
exist, is there a chat/feed, is there an AI assistant. Don't over-ask — most ideas
imply the answers.

### 2 — Design (show the user before building)

Read [references/design-guide.md](references/design-guide.md) and produce a terse
architecture: **DB tables** (columns + types + indexes), **channels**, **agents**
(paid), **functions** (paid). Map the idea → primitives using the guide's rules.
Present this design and get a thumbs-up before provisioning. Keep v1 small: auth +
one table + one channel is a complete app; add agents/functions only if the idea
needs them.

Then write a **provision spec** JSON (see the shape in
[references/provisioning.md](references/provisioning.md)) — `slug`, `allowedOrigins`,
`tables[]`, and (if paid) `agents[]` / `functions[]`. Save it as `app.json` in the
working directory.

### 3 — Provision the backend

All provisioning, hosting, and agent-eject is driven by the **Muhkoo CLI**
(`@muhkoo/cli`). [references/provisioning.md](references/provisioning.md) is the
platform API contract behind it (spec shape + request semantics) — read it to shape
the spec, but you run the CLI, not raw HTTP. Install it once:

```bash
npm install -g @muhkoo/cli      # or prefix every command with: npx -y @muhkoo/cli
```

**Sign in** (developer-authenticated — the CLI stores a session token in
`~/.muhkoo/config.json`):

```bash
muhkoo login --web              # browser sign-in (password / passkey / Google)
# or: muhkoo login              # zero-knowledge login in the terminal (prompts)
# non-interactive / CI: export MUHKOO_DEV_TOKEN=<session token from the portal>
```

**Provision** from the spec (idempotent; writes `.muhkoo-app.json` with the app id +
keys):

```bash
muhkoo provision --spec app.json --base prod
# add --dry-run first to preview the calls
```

`--base` is `staging` | `prod` | `local` (default `prod`). Capture the printed
**test publishable key** (`mk_test_pk_*`) — the client needs it. Agents/functions on
a free account return 402; the CLI skips them and saves the config for later.

### 4 — Scaffold the client

Copy the template and wire it up:

```bash
cp -R <skill-dir>/templates/starter-app <target-dir>
cd <target-dir>
```

Then:
1. **Wire the `@muhkoo/connect` dependency** in `package.json`. In order of
   preference: (a) the published npm version if it exists (`npm view @muhkoo/connect
   version`); (b) a relative `file:` path to a local `connect` checkout; (c) a
   tarball from `npm pack` in the connect repo. The template defaults to
   `file:../connect` — fix the relative path to wherever `connect` actually is.
2. **Edit `src/appConfig.ts`** to match the design: `TABLE.name` + `fields[]` (one
   per column the UI edits) and `CHANNEL` (or `null` to drop the chat tab).
3. **Write `.env.local`** from `.env.example`: `VITE_MUHKOO_KEY=<the test pk>` and
   `VITE_WORKER_URL=https://api.muhkoo.dev` (or staging).
4. **Install.** With a `file:` connect dep, use `npm install --install-links` — this
   *copies* the SDK (and installs its deps fresh) instead of symlinking it. A plain
   `npm install` symlinks, which leaks the SDK's dev `node_modules` into the bundle
   and breaks `npm run build`. (With a published npm version, plain `npm install` is
   fine.) Re-run after any SDK change.

The template (`RecordsBoard`, `ChannelChat`, ZK `AuthScreen`) is the **functional
baseline** — generic MUI, driven by `appConfig.ts`. For richer UIs, edit/add feature
components against the SDK ([references/platform.md](references/platform.md)). The
worked, production reference is the chat app in the `muhkoo/web` repo.

**Design pass (do this — don't ship the default MUI look).** Give the app a
distinctive, production-grade aesthetic with the **`frontend-design`** skill: invoke
it with this app's purpose + audience and the files to restyle (`src/auth/AuthScreen`,
`src/App`, `src/features/*`, `src/theme`, `index.html`). It owns the visual layer —
typography, color, motion, atmosphere, composition. You enforce the **preservation
contract** in [references/design.md](references/design.md): every `data-cy` hook stays,
the `@muhkoo/connect` calls and hooks are untouched, inputs keep their `autocomplete`
attrs, the channel composer stays gated on `ready`, and — **non-negotiable — the result
is responsive** (usable and intentional from ~360px wide to desktop, no horizontal
scroll, header/forms collapse gracefully). The design changes how it *looks*, never how
it *works* — then the Cypress suite (next step), including the mobile-viewport spec, is
the proof it still works **and** is responsive.

**Use the scaffolds.** [scaffolds/](scaffolds/README.md) holds two kinds of blueprint —
read the relevant ones as you build:
- **API scaffolds** (`api-*.md`) — the *applied* pattern + gotchas for each `@muhkoo/connect`
  surface, distilled from our real apps (web chat, discord-clone, standup). When you wire a
  feature against an API, follow its scaffold rather than re-deriving — e.g. the
  [api-space.md](scaffolds/api-space.md) keyring handshake, the [api-db.md](scaffolds/api-db.md)
  `owner`-scoping rule, [api-storage.md](scaffolds/api-storage.md) file manifests.
- **Capability scaffolds** — opt-in add-ons that don't belong in every app; apply the ones
  this app needs instead of bloating the baseline (e.g. [pwa.md](scaffolds/pwa.md) for an
  installable app with safe-area handling).

Each scaffold lists its edits + a contract; re-run the suite after applying.

**Static websites (`templates/static-site`).** When you picked the static template,
the workflow collapses — there's no auth, DB, channels, or SDK to wire:
- **Step 2 (design):** no `tables`/`channels`/`agents`. The provision spec is just a
  `slug` + `allowedOrigins` (and `functions[]` only if the site needs the email-list
  / contact endpoint). You can even skip provisioning a backend entirely and just
  create the app for its hosting slug.
- **Step 3 (provision):** same `muhkoo provision`. To use the email list, add a
  `subscribers` table (`tables[]`) and the `subscribe` function (`functions[]`,
  paid tier) pointing at `functions/subscribe.js`; then set `VITE_SUBSCRIBE_URL` in
  `.env.local` to the printed function URL.
- **Step 4 (scaffold):** `cp -R <skill-dir>/templates/static-site <target-dir>`, then
  `npm install` (no `--install-links` — there's no `file:` SDK dep). Edit
  `index.html` / `src/style.css` / `src/main.js`. The design pass still applies
  (it's just a website — make it good); there's no preservation contract beyond
  keeping it responsive.
- **Step 6 (verify):** `npm run dev`, eyeball it; if you added the function, submit
  the form and confirm a row lands in the `subscribers` table.
- **Step 7 (host):** identical — `npm run deploy` ships `dist/` to
  `<slug>.apps.muhkoo.dev`.

If the design has an agent: edit `src/agent/agentApp.ts` (the `@Muhkoo*`-decorated
description — see [references/decorators.md](references/decorators.md)), then eject:

```bash
muhkoo eject <target-dir>/src/agent/agentApp.ts
```

Put the printed `systemPrompt` + `tools` into the spec's `agents[]` entry (with a
function-calling `model` and `enableChannel: "<channel>"`), re-run `muhkoo provision`,
then — **after the app has run once so the channel exists** — enable it:

```bash
muhkoo provision --spec app.json --base prod --enable
```

### 6 — Run, verify, debug

```bash
cd <target-dir> && npm run dev      # http://localhost:5173
```

**Run the Cypress suite — this is how you verify the built app actually works.** The
template ships an end-to-end suite (`cypress/e2e/`) that drives the *real* backend:
ZK register/login, the database CRUD, and the channel round-trip. One command boots
the dev server and runs it headless:

```bash
cd <target-dir> && npm run test:e2e
```

The specs are driven by the `data-cy` hooks in the components and the `tasks`/channel
in `appConfig.ts` — when you customize the data model, update the selectors/values in
`cypress/e2e/02-records.cy.ts` (and `03-channel.cy.ts`) to match. **Run it, read the
failures, and fix them** — a failing spec is a real bug in the wiring (CORS, app key,
selectors, a missing table). Keep iterating until the suite is green; that's the bar
for "the app works."

Also confirm by hand if useful (register → add a record → send a channel message →
@-mention the agent). Watch the app's **server logs** to debug backend-side failures —
portal **Tools → Logs**, or the `logs/*` routes in
[references/platform.md](references/platform.md).

> Gotcha: Cypress runs against `npm run dev`, which needs the SDK installed with
> `--install-links` (step 4). The suite hits the live backend, so the app must be
> provisioned and `.env.local` filled in first.

### 7 — Host it on Muhkoo (optional)

Every app already has a DNS subdomain — `https://<slug>.apps.muhkoo.dev` (printed by
`muhkoo provision`). Offer to **host the client there** so the user doesn't need their
own hosting; it's a deploy away (or skip it and run/deploy the SPA however they like).
See [references/hosting.md](references/hosting.md) for the full contract. The template's
`npm run deploy` wraps `muhkoo deploy` (build + ship), and a GitHub Action does the same.

```bash
cd <target-dir>
npm run deploy            # builds, then runs `muhkoo deploy`
# equivalently, from a provisioned dir (.muhkoo-app.json present):
#   npm run build && muhkoo deploy
# or fully explicit:
#   npm run build && muhkoo deploy --app <appId> --key <mk_*_sk_*>
```

`muhkoo deploy` reads the app id + secret key from `.muhkoo-app.json` (or `--app` /
`--key` / `MUHKOO_APP_ID` / `MUHKOO_DEPLOY_KEY`). Deploys are authorized by the app's
**secret key** (`mk_*_sk_*`) — server-side only, never the browser bundle. Hosted bytes
count against the account's **storage quota**. For CI, wire the bundled
`.github/workflows/deploy.yml`: set repo secrets `MUHKOO_DEPLOY_KEY` (sk),
`MUHKOO_APP_ID`, and `VITE_MUHKOO_KEY` (pk) — it builds + deploys on every push to
`main`. Rollback / release history / status: `muhkoo hosting …` (or the `/hosting` API
in the reference).

On a **paid plan**, the user can also serve the app on **their own domain** — that's a
portal action (the app's **Custom domains** card: add the hostname, then add the two
CNAMEs it shows at their DNS provider; the TLS cert is auto-issued and renewed). Worth
mentioning when you offer hosting; details in [references/hosting.md](references/hosting.md).

### 8 — Harvest a scaffold (optional, but do it when the build taught you something)

A build reworks the user's prompt into a real app — a spec + working feature code. When
that rework produced something worth not re-deriving (a non-obvious pattern, a new
capability, a clean data-model shape), **extract it back into the scaffold library** so
the next build starts ahead. The helper writes the scaffold skeleton in the canonical
shape **and** captures the build's reworked `app.json` as a genericized, reusable seed:

```bash
node <skill-dir>/scripts/extract-scaffold.mjs --name <kebab> --kind api|capability \
  --from <target-dir>     # captures its app.json → scaffolds/seeds/<name>.spec.json
```

Then fill in `scaffolds/<name>.md` from the *real* code you wrote (pattern + gotchas +
`See it in`) and add a row to [scaffolds/README.md](scaffolds/README.md). Only extract
from a **green** app — the suite is the proof the pattern works. Full procedure:
[references/extracting-scaffolds.md](references/extracting-scaffolds.md).

## Principles

- **Show the design before you build.** Provisioning creates real resources.
- **Read the reference files** rather than guessing the API — they're the source of
  truth and stay in sync with the platform.
- **Start small, grow additively.** Tables update via additive PUT; agents/functions
  are separate creates you can add later. Degrade gracefully when a feature needs a
  paid plan.
- **Never commit on the user's behalf.** Leave changes in the working tree.
- **Secrets:** the publishable key (`mk_*_pk_*`) ships in the browser bundle; the
  secret key and the developer password do not — never write them into committed
  files.
