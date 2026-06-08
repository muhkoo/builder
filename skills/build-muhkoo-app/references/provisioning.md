# Provisioning reference

How the backend of a Muhkoo app is created. This is the **developer-authenticated**
surface (distinct from the app-key runtime SDK). The `scripts/provision.mjs` helper
implements all of this; this doc is the contract it follows and the source of truth if
you provision by hand.

## Authentication: `Authorization: Bearer <developer-session-token>`

All `/api/apps/*` and `/api/developer/*` management routes are authed with a **developer
session token** in the `Authorization: Bearer` header (verified in the accelerator's
`resolveSession`). Ownership is `app.developerCommitment === session.commitment`.

> ⚠️ This is **not** the SDK's auth. The SDK sends `X-Muhkoo-Key` (app key) and
> `X-Muhkoo-Session` (end-user session) — those do not authenticate these management
> routes. Provisioning is raw HTTP with a Bearer dev token.

### Getting a developer session token (two paths)

1. **Programmatic (preferred).** Log in as the developer with ZK auth and use the
   resulting token as the Bearer:
   ```js
   const client = new Client({ baseUrl });
   await client.auth.zk.login(username, password);
   const token = client.auth.zk.token; // ← use as Authorization: Bearer
   ```
   Requires the developer's Muhkoo credentials (read from env / a local config — never
   hard-code). ZK login in Node needs the `snarkjs` peer dep + circuit assets; if that
   isn't available in the environment, fall back to path 2.

2. **Paste a token (fallback).** The developer signs into the
   [portal](https://portal.muhkoo.dev) and copies their session token (the value the
   portal stores after login), or creates the app in the portal UI and pastes the
   resulting `mk_*` key. `provision.mjs` accepts a token or a pre-made app key.

## Route table (all under the production/staging API base)

| Method | Path | Body | Purpose |
| --- | --- | --- | --- |
| POST | `/api/developer/bootstrap` | `{ email }` | One-time: create Stripe customer + developer record |
| GET | `/api/developer/me` | — | Read developer record (tier, email) |
| GET | `/api/apps` | — | List your apps |
| GET | `/api/apps/slug-available?slug=` | — | Check slug availability |
| POST | `/api/apps` | `{ slug, allowedOrigins?, email? }` | **Create app** → keys |
| GET | `/api/apps/:appId` | — | App detail + key metadata |
| PATCH | `/api/apps/:appId` | `{ allowedOrigins }` | Update CORS allowlist |
| GET | `/api/apps/:appId/db/tables` | — | List table specs |
| PUT | `/api/apps/:appId/db/tables/:table` | `DbTableSpec` | **Create / additively update** a table |
| DELETE | `/api/apps/:appId/db/tables/:table` | — | Drop a table spec |
| POST | `/api/apps/:appId/agents` | `AgentCreateInput` | **Create agent** (paid) |
| POST | `/api/apps/:appId/agents/:id/enable` | `{ targetSpaceId }` | Enable agent on a channel |
| POST | `/api/apps/:appId/functions` | `FunctionDeployInput` | **Deploy function** (paid) |
| POST | `/api/apps/:appId/functions/:id/enable` | `{ targetSpaceId }` | Enable function on a channel |
| GET | `/api/apps/agent-models` | — | Edge AI model catalog + which support tool-use |
| PATCH | `/api/apps/:appId/shared-config` | `{ spaceId, allowedOrigins }` | App config / manifest |
| POST | `/api/apps/:appId/keys/rotate` | — | Issue a fresh key set |

## Create app

```http
POST /api/apps
Authorization: Bearer <devToken>
{ "slug": "team-standup", "allowedOrigins": "*" }
```

- `slug` must match `^[a-z0-9-]{3,32}$` and is globally unique. Check first with
  `/api/apps/slug-available?slug=`.
- `allowedOrigins`: comma-separated origins or `"*"` (CORS allowlist for the app's
  browser clients). Tighten to the real origin before production.
- **First app for a brand-new developer**: the response asks for a billing `email`.
  Either pre-call `POST /api/developer/bootstrap { email }`, or resend create with
  `{ slug, allowedOrigins?, email }`.

**Response** (`plaintext` keys are shown **once** — capture them now):

```jsonc
{
  "appId": "…16 hex bytes…",
  "slug": "team-standup",
  "scriptName": "app-…",
  "allowedOrigins": "*",
  "scriptUploaded": true,
  "keys": [
    { "keyId": "…", "env": "live", "type": "sk", "plaintext": "mk_live_sk_…" },
    { "keyId": "…", "env": "live", "type": "pk", "plaintext": "mk_live_pk_…" },
    { "keyId": "…", "env": "test", "type": "sk", "plaintext": "mk_test_sk_…" },
    { "keyId": "…", "env": "test", "type": "pk", "plaintext": "mk_test_pk_…" }
  ]
}
```

The client app uses the **publishable** key (`pk`). Develop against `mk_test_pk_*`.

## Define a database table

```http
PUT /api/apps/:appId/db/tables/tasks
Authorization: Bearer <devToken>
```
Body is a `DbTableSpec`:

```jsonc
{
  "table": "tasks",
  "columns": [
    { "name": "title",      "type": "text",      "nullable": false },
    { "name": "done",       "type": "boolean",   "nullable": false, "default": false },
    { "name": "owner",      "type": "text",      "nullable": true },
    { "name": "created_at", "type": "timestamp", "nullable": false }
  ],
  "indexes": [
    { "name": "idx_tasks_done", "columns": ["done"] }
  ]
}
```

- **Column types**: `text | integer | real | boolean | timestamp | json`.
- `nullable` defaults to `true` if omitted; set `false` for NOT NULL.
- At most one column may set `primaryKey: true`. If none does, the server adds a
  synthetic `_id INTEGER PRIMARY KEY AUTOINCREMENT` — fine for most apps; use `_id` as
  the row id in `get/update/delete`.
- Updates are **additive** (add columns/indexes). Destructive changes return `409` —
  drop + recreate, or use a new column.
- Identifiers: leading letter/underscore, then letters/digits/underscores; reserved
  names rejected.

## Create an agent (paid)

```http
POST /api/apps/:appId/agents
```
Body (`AgentCreateInput`):

```jsonc
{
  "handle": "@helper",
  "displayName": "Helper",
  "systemPrompt": "…",                  // from ejectAgentPrompt() — see decorators.md
  "model": "meta/llama-3.3-70b-instruct-fp8-fast", // tool-use needs a fn-calling model
  "tools": {                            // from ejectAgentTools()
    "enabled": true,
    "db": { "mode": "read", "tables": ["tasks"] },
    "functions": [],
    "channels": true,
    "maxIterations": 3
  },
  "triggers": [{ "type": "mention" }],
  "caps": { "dailyTokenBudget": 100000 }
}
```

- Model ids are **public / prefix-less** (`meta/llama-…`, not `@cf/meta/…`).
- `tools.enabled: true` **requires** a function-calling model in the same payload.
  Get the catalog + `fnCallingModels` from `GET /api/apps/agent-models`.
- After create, **enable** the agent on the channel it should watch:
  `POST /api/apps/:appId/agents/:agentId/enable { "targetSpaceId": "<spaceId>" }`.
  The channel's `spaceId` comes from `client.space.resolveChannel(name)` (the channel
  must exist first — create it from the client, or have the app create it on first run).

## Deploy a function (paid)

```http
POST /api/apps/:appId/functions
```
Body (`FunctionDeployInput`):

```jsonc
{
  "name": "hello",                 // DNS-safe slug
  "displayName": "Hello",
  "code": "export default { async fetch(request) { return new Response('hi'); } };",
  "triggers": { "http": { "enabled": true, "methods": ["GET", "POST"] } },
  "caps": { "cpuMs": 50, "subRequests": 10, "dailyInvocationBudget": 10000 }
}
```

HTTP-triggered functions get a URL of the form `<name>--<slug>.<functions-domain>`.
Space-triggered functions auto-run on matching messages once enabled on a channel.

## Idempotency & ordering

1. Bootstrap developer (only if `/api/developer/me` 404s) →
2. Create app (skip if a slug→appId mapping is already recorded locally) →
3. PUT each table (PUT is create-or-additive-update; safe to re-run) →
4. (paid) create agents / deploy functions →
5. enable agents/functions on channels **after** the channels exist.

`provision.mjs` records `{ appId, keys, tables }` to a local `.muhkoo-app.json` so
re-runs are idempotent and the scaffold step can read the app key back.
