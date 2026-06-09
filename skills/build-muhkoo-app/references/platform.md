# Muhkoo platform reference

Everything the skill needs to know about the platform surface. This is the
authoritative cheat-sheet — prefer it over guessing or re-deriving from source.
The live docs are at <https://docs.muhkoo.dev>.

SDK: **`@muhkoo/connect`** (current `0.6.0-alpha.0`). The client owns eight
namespaces. A runtime client app talks to the platform **only** through this SDK
with an **app key** (`mk_*`). Provisioning (creating the app, tables, agents,
functions) is a separate developer-authenticated surface — see
[provisioning.md](./provisioning.md).

## Base URLs

| Environment | API base URL |
| --- | --- |
| Production | `https://api.muhkoo.dev` |
| Staging | `https://api.staging.muhkoo.dev` |
| Local | `http://localhost:8787` (via `wrangler dev` in the accelerator repo) |

The SDK derives every concrete endpoint (REST, WebSocket, shard upload) from the
single `baseUrl`. If you omit `baseUrl`, the SDK uses the hosted production default.

## Constructing the client

```ts
import { Client } from "@muhkoo/connect";

const client = new Client({
  apiKey: "mk_test_pk_…",          // publishable app key (test or live)
  baseUrl: "https://api.muhkoo.dev" // omit to use the hosted default
});
```

`ClientOptions`: `{ apiKey?, baseUrl?, circuits?, sessionStore?, fetch?, logLevel? }`.
In the browser, `sessionStore` defaults to `localStorage` (with in-memory fallback),
so sessions persist across reloads.

## The two key kinds

- **Publishable key** `mk_live_pk_*` / `mk_test_pk_*` — safe to ship in a browser
  bundle. This is what a client app uses. `test` and `live` are fully isolated data
  planes (separate channels, separate DB rows).
- **Secret key** `mk_live_sk_*` / `mk_test_sk_*` — server-side only. Not needed for a
  browser client.

## The eight namespaces

### `client.auth` — ZK authentication (passwordless on the server)

```ts
await client.auth.zk.register({ username, password, email?, login? }); // login defaults true
await client.auth.zk.login(username, password, { rememberMe? });        // → AuthUser
await client.auth.zk.unlock(password);   // re-derive identity material for E2E crypto
await client.auth.zk.restore();          // restore a persisted session → AuthUser | null
await client.auth.zk.recover();          // silent re-auth when unlocked → boolean
await client.auth.zk.logout();
client.auth.zk.user;      // AuthUser | null  { username, commitment }
client.auth.zk.token;     // current session token (string | null)
client.auth.zk.identity;  // in-memory identity (null when locked)
```

`commitment` is the user's stable id (a Poseidon hash). Encryption/messaging requires
an **unlocked** identity — `login()` unlocks; after `restore()` you call `unlock(password)`.

### `client.kv` — per-user key/value (encrypted at rest)

```ts
await client.kv.set(collection, id, value, { encrypt? }); // encrypt defaults true
await client.kv.get(collection, id);     // → T | null
await client.kv.delete(collection, id);  // → boolean
await client.kv.list(collection);        // → string[]
client.kv.on("change", (e) => { /* e.collection, e.id, e.type, e.data */ }); // → unsubscribe
```

Per-user private storage. Synced across the user's devices; not shared between users.

### `client.db` — scalable database (developer-defined tables)

Tables are **declared at provision time** (see provisioning.md). At runtime:

```ts
const tasks = client.db.table("tasks");
await tasks.insert({ title: "Ship it", done: false }); // → { row, id }
await tasks.get(id);                                     // → row | null
await tasks.query({ where: [{ column: "done", op: "eq", value: false }],
                    orderBy: { column: "created_at", dir: "desc" },
                    limit: 50, cursor });                // → { rows, nextCursor }
await tasks.update(id, { done: true });                  // → { row }
await tasks.delete(id);                                  // → 0 | 1
```

`where` ops: `eq neq gt gte lt lte in like likeStartsWith likeContains`. `limit` is
clamped to 100 server-side; paginate with `nextCursor`.

### `client.storage` — file storage (chunked, encrypted)

```ts
await client.storage.writeFile({ spaceId, data, metadata: { name, type } }); // → { stat, manifest }
await client.storage.readFile(spaceId, fileId);   // → { data, stat }
await client.storage.listFiles({ spaceId? });     // → FileStat[]
await client.storage.deleteFile(spaceId, fileId); // → boolean
await client.storage.getManifest(spaceId, fileId);// share capability
```

### `client.message` — realtime pub/sub + direct messages

```ts
const sub = client.message.subscribe(subject, (e) => { /* e.from, e.data */ });
await client.message.publish(subject, data);        // plaintext fan-out
await client.message.send("user:<id>", payload);    // E2E-encrypted DM
sub.unsubscribe();
```

### `client.space` — end-to-end-encrypted group channels

A **channel** is a named Space. Contents are sealed with a shared group key the
server never sees; history is persisted and replayed on join.

```ts
await client.space.createChannel(name, { historyPolicy?, private? }); // → Space
await client.space.joinChannel(name, { timeoutMs? });                 // → Space (connected)
await client.space.listChannels();      // → [{ name, spaceId }]
await client.space.resolveChannel(name);// → spaceId | null
await client.space.createInviteLink(spaceId, { expiresInSec?, maxUses?, role? });
await client.space.joinByInvite(spaceId, token, { timeoutMs? });
await client.space.members(spaceId);    // → [{ memberId, role }]
```

On a connected `Space` handle:

```ts
await space.sendMessage({ contents: "hi" }, { channel: name });
space.onMessage((e) => { /* decrypted message */ });
const { messages } = await space.history({ limit: 100 });
space.isConnected();
```

### `client.agents` — programmable agents (management; **paid plan**)

Server-side "virtual users" backed by edge AI that read and reply in a Space, and —
when given tools — act on the app (query/insert DB rows, call functions, resolve
channels). Managed via the developer-authenticated routes (provisioning.md), but the
SDK also exposes them:

```ts
await client.agents.create(appId, { handle, displayName, systemPrompt, model, tools });
await client.agents.enable(appId, agentId, spaceId); // opt the agent into a channel
```

Describe the app's agent-facing surface with decorators and **eject** the prompt +
tools — see [decorators.md](./decorators.md).

### `client.functions` — serverless functions (management; **paid plan**)

Developer-authored per-app Workers, triggered by HTTP or by messages in a Space:

```ts
await client.functions.deploy(appId, { name, displayName, code, triggers, caps });
await client.functions.enable(appId, functionId, spaceId);
```

## Hosting — every app gets a subdomain

Every app gets a DNS subdomain **`https://<slug>.apps.muhkoo.dev`** (the `<slug>` is the
app's slug). Deploy the built client there with the bundled `scripts/deploy.mjs`
(`npm run deploy`) or the GitHub Action — no separate hosting account. Content-addressed
+ instant + rollback-able. Authed by the app **secret key**; hosted bytes count against
the storage quota. Full contract: [hosting.md](./hosting.md).

## Server logs — the debug loop

Every app has an E2E-encrypted `__logs__` Space. The owner reads it from the portal
(**Tools → Logs**, no app key needed) or via `GET /api/apps/:appId/logs/*`. After you
provision and run an app, this is where you watch auth, DB, channel, agent, and
function activity to confirm things work and diagnose failures. Logs are a ring buffer
(recent activity, not permanent).

## Tiers

- **Free**: auth, KV, DB, storage, channels.
- **Paid**: adds programmable agents + serverless functions. Provisioning those on a
  free account returns `402`. The skill detects this and degrades gracefully (provision
  everything else; emit the agent/function configs as ready-to-apply once upgraded).
