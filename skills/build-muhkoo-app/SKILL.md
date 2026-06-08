---
name: build-muhkoo-app
description: Build a complete application on the Muhkoo platform from a plain-language idea — design the data model, provision the backend (app key, database tables, channels, AI agents, serverless functions), and scaffold a working Vite + React + @muhkoo/connect client with ZK auth. Use when the user wants to build, scaffold, or prototype an app on Muhkoo, or asks to "build me a … app on Muhkoo".
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
serverless functions. The SDK is `@muhkoo/connect`. Full surface:
[references/platform.md](references/platform.md).

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

Read [references/provisioning.md](references/provisioning.md) for the auth model and
exact request shapes. Provisioning is developer-authenticated (`Authorization:
Bearer <session token>`) — **not** the app key.

Resolve a developer session, preferring the programmatic path:
- **Programmatic:** ask the user for their Muhkoo username/password (or have them set
  `MUHKOO_USERNAME` / `MUHKOO_PASSWORD`); `provision.mjs` logs in via the SDK. This
  needs `@muhkoo/connect` resolvable from the run directory — run it from the
  scaffolded app after `npm install` (step 4), or from any dir where the SDK is
  installed.
- **Fallback:** have the user sign into the [portal](https://portal.muhkoo.dev) and
  paste their session token (`--token`), **or** create the app in the portal UI and
  paste the `mk_test_pk_*` key (then provision tables in the portal too).

Run the provisioner (it's idempotent; writes `.muhkoo-app.json` with the app id +
keys):

```bash
node <skill-dir>/scripts/provision.mjs --spec app.json --base staging \
  --username "$MUHKOO_USERNAME" --password "$MUHKOO_PASSWORD"
# or: --token <sessionToken>     (paste from the portal)
# add --dry-run first to preview the calls
```

`--base` is `staging` | `prod` | `local` (default `prod`). Capture the printed
**test publishable key** (`mk_test_pk_*`) — the client needs it. Agents/functions
on a free account return 402; the script skips them and saves the config for later.

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
   `VITE_WORKER_URL=https://api.staging.muhkoo.dev` (or prod).
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
attrs, and the channel composer stays gated on `ready`. The design changes how it
*looks*, never how it *works* — then the Cypress suite (next step) is the proof it
still works.

### 5 — Agents (paid, optional)

If the design has an agent: edit `src/agent/agentApp.ts` (the `@Muhkoo*`-decorated
description — see [references/decorators.md](references/decorators.md)), then eject:

```bash
node <skill-dir>/scripts/eject-agent.mjs <target-dir>/src/agent/agentApp.ts
```

Put the printed `systemPrompt` + `tools` into the spec's `agents[]` entry (with a
function-calling `model` and `enableChannel: "<channel>"`), re-run `provision.mjs`,
then — **after the app has run once so the channel exists** — enable it:

```bash
node <skill-dir>/scripts/provision.mjs --spec app.json --base staging --token <t> --enable
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
[references/platform.md](references/platform.md). To ship: `npm run build` then
`npx wrangler deploy` (set `account_id` + `name` in `wrangler.jsonc`).

> Gotcha: Cypress runs against `npm run dev`, which needs the SDK installed with
> `--install-links` (step 4). The suite hits the live backend, so the app must be
> provisioned and `.env.local` filled in first.

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
