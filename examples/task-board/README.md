# Task Board — a worked Muhkoo app

The canonical example the **build-muhkoo-app** skill produces: a shared, team-wide
task list with a realtime channel and an AI helper. Built end-to-end on Muhkoo with
ZK auth, the scalable database, an E2E-encrypted channel, and a programmable agent.

This is the actual output of running the skill against staging — provisioned with
`app.json`, scaffolded from `../../skills/build-muhkoo-app/templates/starter-app`.

## The design

| Primitive | What it is |
| --- | --- |
| **Auth** | ZK register / login (passwordless on the server) |
| **DB table `tasks`** | `title` (text), `done` (boolean, default false), `owner` (text), `created_at` (timestamp); index on `done` |
| **Channel `general`** | E2E-encrypted team chat, created at runtime |
| **Agent `@helper`** | reads & writes `tasks`, posts to `general`, replies on @mention (paid plan) |

`src/appConfig.ts` is the single knob the generic UI reads (table + fields + channel).
`src/agent/agentApp.ts` is the `@Muhkoo*`-decorated agent description.

## Provision the backend

```bash
# from this directory, with your Muhkoo dev credentials
MUHKOO_USERNAME=… MUHKOO_PASSWORD=… \
  node ../../skills/build-muhkoo-app/scripts/provision.mjs --spec app.json --base staging
```

This creates the app + `tasks` table + `@helper` agent and writes `.muhkoo-app.json`
(app id + keys). Put the printed `mk_test_pk_…` into `.env.local`. After the app has
run once (so `general` exists), enable the agent on it:

```bash
node ../../skills/build-muhkoo-app/scripts/provision.mjs --spec app.json --base staging --enable
```

## Run the client

```bash
npm install --install-links   # copies the file: @muhkoo/connect dep
cp .env.example .env.local    # paste your VITE_MUHKOO_KEY + VITE_WORKER_URL
npm run dev                   # http://localhost:5173
```

Register a user, add tasks (DB), chat in **#general**, and `@helper`-mention the agent
to have it list or add tasks for you.

## Test it

```bash
npm run test:e2e     # boots the dev server + runs the Cypress suite headless
```

The suite (`cypress/e2e/`) exercises the live backend end-to-end: ZK auth, the `tasks`
database CRUD, and the encrypted **#general** channel round-trip. All four specs pass
against staging.

## Notes

- `@muhkoo/connect` here is a `file:` path into the monorepo (`../../../connect`).
  Once the SDK is published, switch to the npm version and a plain `npm install`.
- `.env.local` and `.muhkoo-app.json` hold app-specific values and are gitignored.
