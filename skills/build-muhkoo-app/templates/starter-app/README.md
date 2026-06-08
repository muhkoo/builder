# {{APP_NAME}}

A Muhkoo app — Vite + React + [`@muhkoo/connect`](https://docs.muhkoo.dev), with
ZK auth, a database, and an end-to-end-encrypted realtime channel.

## Run it

```bash
npm install --install-links  # --install-links copies a file: @muhkoo/connect dep
cp .env.example .env.local   # fill in VITE_MUHKOO_KEY + VITE_WORKER_URL
npm run dev                  # http://localhost:5173
```

> If `@muhkoo/connect` is a published npm version (not a `file:` path), a plain
> `npm install` is fine. The `--install-links` flag matters only for `file:` deps —
> it copies the SDK instead of symlinking it, which keeps the production build
> (`npm run build`) working.

Register a user, then add records (database) and chat in the channel.

## Test it (end-to-end)

A Cypress suite drives the **real** backend — ZK register/login, the database CRUD,
and the channel round-trip:

```bash
npm run test:e2e     # boots the dev server, runs Cypress headless, tears down
# or, with the dev server already running:
npm run cy:open      # interactive
```

The specs in `cypress/e2e/` are driven by the `data-cy` attributes in the components
and the table/channel in `src/appConfig.ts`. When you change the data model, update
the selectors/values in `cypress/e2e/02-records.cy.ts` (and `03-channel.cy.ts`). The
app must be provisioned and `.env.local` filled in first — the suite hits the live API.

## Configure

- **`src/appConfig.ts`** — the table name + fields and the channel the UI is built
  from. Change these to match your provisioned backend.
- **`.env.local`** — `VITE_MUHKOO_KEY` (publishable app key) and `VITE_WORKER_URL`
  (API base: `https://api.staging.muhkoo.dev` or `https://api.muhkoo.dev`).

## Structure

```
src/
  lib/client.ts        # the @muhkoo/connect Client singleton
  auth/                # ZK register / login
  features/
    RecordsBoard.tsx   # CRUD over the configured DB table (client.db)
    ChannelChat.tsx    # realtime E2E channel (client.space)
  agent/agentApp.ts    # (optional, paid) agent description → `npm run eject:agent`
  appConfig.ts         # table + channel the UI reads from
```

## Deploy

```bash
npm run build
# set account_id + name in wrangler.jsonc, then:
npx wrangler deploy
```

The build is static assets served from a Cloudflare Worker (SPA fallback enabled).
