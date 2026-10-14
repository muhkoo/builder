# {{APP_NAME}}

A Muhkoo app — Vite + React + [`@muhkoo/connect`](https://docs.muhkoo.dev), with
hosted sign-in ("Continue with Muhkoo"), a database, and an end-to-end-encrypted
realtime channel.

## Run it

```bash
npm install
cp .env.example .env.local   # fill in VITE_MUHKOO_KEY, VITE_MUHKOO_APP_ID + VITE_WORKER_URL
npm run dev                  # http://localhost:5173
```

> Developing against a local `connect` checkout instead of the npm release? Point
> the dependency at it with a `file:` path and install with
> `npm install --install-links`, which copies the SDK instead of symlinking it and
> keeps the production build (`npm run build`) working.

Sign in, then add records (database) and chat in the channel.

## Paid-only apps and past-due accounts

If you switch on **Paid Muhkoo accounts only** for this app in the portal (app →
**Deploy** tab), Free users can still sign in and read, but writes that add data
are refused. The same happens for everyone if the app owner's payment is past due.
The app handles both: `src/lib/paymentErrors.ts` turns the SDK's
`PaymentRequiredError` into a message with an **Upgrade** / **Update payment**
link, and `AuthContext` asks `client.app.access()` after sign-in so the home
screen can show a banner before the first refused write.

## Test it (end-to-end)

A Cypress suite drives the **real** backend — the sign-in entry, the database CRUD,
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
  (API base: `https://api.muhkoo.dev` or `https://api.staging.muhkoo.dev`).

## Structure

```
src/
  lib/client.ts        # the @muhkoo/connect Client singleton
  lib/paymentErrors.ts # payment refusals → user-facing notice + upgrade link
  auth/                # hosted sign-in, sign-out, client.app.access()
  features/
    RecordsBoard.tsx   # CRUD over the configured DB table (client.db)
    ChannelChat.tsx    # realtime E2E channel (client.space)
    NoticeAlert.tsx    # renders a notice (and its Upgrade link)
  agent/agentApp.ts    # (optional, paid) agent description → `npm run eject:agent`
  appConfig.ts         # table + channel the UI reads from
```

## Deploy

```bash
npm run deploy       # builds, then ships dist/ to <slug>.apps.muhkoo.dev (muhkoo deploy)
```

`.github/workflows/deploy.yml` does the same on every push to `main`.
