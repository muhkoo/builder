# Muhkoo platform reference

Everything the skill needs to know about the platform surface. This is the
authoritative cheat-sheet — prefer it over guessing or re-deriving from source.
The live docs are at <https://docs.muhkoo.dev>.

SDK: **`@muhkoo/connect`** (current `0.15.0-alpha.5`; the starter template depends on
`^0.15.0-alpha.5`). The client's namespaces: `auth`, `kv`, `db`, `storage`, `vfs`,
`vcs`, `message`, `space`, `trust`, `agents`, `functions`, `accessTokens`, `app`,
`offline`. A runtime client app talks to the platform **only** through this SDK
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

`ClientOptions`: `{ apiKey?, accessToken?, baseUrl?, authBaseUrl?, circuits?,
sessionStore?, fetch?, logLevel?, functionsHostSuffix?, offline?, p2p? }`.
In the browser, `sessionStore` defaults to `localStorage` (with in-memory fallback),
so sessions persist across reloads.

## The two key kinds

- **Publishable key** `mk_live_pk_*` / `mk_test_pk_*` — safe to ship in a browser
  bundle. This is what a client app uses. `test` and `live` are fully isolated data
  planes (separate channels, separate DB rows).
- **Secret key** `mk_live_sk_*` / `mk_test_sk_*` — server-side only. Not needed for a
  browser client.

## The namespaces

The sections below cover the ones a scaffolded app uses. The rest, in one line each:
`client.vfs` (a filesystem over the user's encrypted personal space — `writeFile`,
`readFile`, `list`, `mkdir`, `rename`, `delete`, `history`, `restore`), `client.vcs`
(version control over the VFS — `client.vcs.open(slug)` → a repo with `commit`, `log`,
`branch`, `switchTo`, `merge`, `status`, `diff`), `client.trust` (pinned identities for
signed private channels), `client.accessTokens` (scoped, expiring machine credentials),
`client.app` and `client.offline` (see [Payments & access](#payments--access)).

### `client.auth` — authentication (passwordless on the server)

**Hosted auth (`client.auth.hosted`) is the default for new scaffolds** — the app
redirects to `auth.muhkoo.dev` instead of embedding login UI + proving circuits.
See [api-auth-hosted.md](../scaffolds/api-auth-hosted.md).

```ts
await client.auth.hosted.login({ appId, redirectUri, prompt?, returnTo? }); // redirect to auth.muhkoo.dev
await client.auth.hosted.handleCallback();               // on the callback → { username, commitment }
client.auth.hosted.isCallback();                         // guard the callback route
await client.auth.hosted.manageAccount({ returnUri });   // account & security page
```

`prompt: "login"` asks for credentials even when the hosted page remembers this
browser ("Keep me signed in"). Pass it on the sign-in that follows your app's own
sign-out, or the user lands straight back in. `returnTo` is a same-origin path
handed back from `handleCallback()`.

The embedded zero-knowledge surface below stays available when you want the
login UX fully in-app:

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
client.auth.zk.seedBase64; // master seed as base64 (string | null; null when locked)

// Account recovery & passkeys — the password is now a *factor*, not the source of keys.
// A random master seed (same commitment, backward-compatible) is wrapped per factor in
// a server-blind vault. All of the below are additive; signed-in unless noted.
await client.auth.zk.enrollPasskey({ rpId?, rpName?, label? }); // add a WebAuthn (PRF) passkey
await client.auth.zk.loginWithPasskey(username);   // → AuthUser  passwordless sign-in
client.auth.zk.passkeyAvailable();                 // boolean — WebAuthn usable here
await client.auth.zk.passkeyPrfAvailable();        // boolean | null (null = undeterminable → hide passkey)
await client.auth.zk.enrollRecoveryPhrase();       // → string  24-word BIP39, shown ONCE (it IS the seed)
await client.auth.zk.recoverWithPhrase(username, mnemonic); // → AuthUser  forgot-password path
await client.auth.zk.changePassword(newPassword);  // re-wraps the unchanged seed (commitment never moves)
await client.auth.zk.listFactors();   // → [{ id, type: "password"|"passkey"|"phrase-marker", label?, createdAt? }]
await client.auth.zk.removeFactor(id); // can't remove the last factor

// VaultUnavailableError (exported) — login/unlock throw this when the vault is unreachable
// (network / 5xx / rate-limit). Distinct from a wrong password → "retry", not "wrong password".
import { VaultUnavailableError } from "@muhkoo/connect";
```

`commitment` is the user's stable id (a Poseidon hash). Encryption/messaging requires
an **unlocked** identity — `login()` unlocks; after `restore()` you call `unlock(password)`.

**Recovery makes accounts un-lose-able.** Passkeys give passwordless sign-in; a recovery
phrase is a forgot-password path; `changePassword` rotates the password without moving the
identity. Legacy accounts migrate to the vault transparently on first vault-aware login/unlock.
**Wrap any per-user encrypted app-data under `seedBase64`, not the password** — the seed is
stable across password changes and is available under passwordless passkey login, so chat
ratchet keys / KV secrets survive both (see [api-auth.md](../scaffolds/api-auth.md)).

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
await client.space.createChannel(name, { historyPolicy?, private? }); // → Space; private = signed member list
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

A **private** channel (`private: true`) keeps a signed member list: members are
added with `space.add` / `remove` / `setRole`, a removed member is cut off at the relay,
and its key is not rotated. A *locked* session (restored after a reload, seed not in
memory) can't take part: `createChannel` throws `IdentityLockedError`, so gate
channels on `client.auth.zk.identity`, as the template does.

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

Developer-authored per-app functions, triggered by HTTP or by messages in a Space:

```ts
await client.functions.deploy(appId, { name, displayName, code, triggers, caps });
await client.functions.enable(appId, functionId, spaceId);
```

## Payments & access

An app's owner can switch on **"Paid Muhkoo accounts only"** — an owner-only toggle
in the portal (the app → **Deploy** tab, live environment). It is not a provision-spec
field. With it on, a Free user's writes that **add data** are refused. Separately, if
the app **owner's** payment is past due, the app's writes are refused for every user,
on any tier. Reads, sign-in and deletes keep working.

**`PaymentRequiredError`** (exported; a subclass of `HttpError`, `status` 402) is what
the SDK throws for such a refusal. `err.code` is one of:

| `code` | Meaning | Tell the user |
| --- | --- | --- |
| `user_plan_required` | Paid-only app, user on Free. (Third-party apps get this for a past-due user too.) | "This app needs a paid Muhkoo plan." + **Upgrade** link |
| `user_payment_past_due` | The user's own payment is past due (first-party apps only). | "Your Muhkoo payment is past due — update your payment method." + link |
| `owner_payment_past_due` | The app owner's payment is past due. | "This app can't save changes right now." — no action |

`err.upgradeUrl` is the portal page to send the user to, set only when the server
sent an absolute http(s) URL. It comes from `client.kv`, `client.db`, `client.vfs`,
`client.space.createSpace`/`createChannel` and file uploads. It does **not** come from a
message sent over a Space's live socket (that refusal isn't surfaced), from keyring
requests, or from `client.functions.invoke` (which returns the raw `Response`). Every
other 402 (the Free tier's quota refusals) stays a plain `HttpError`.

```ts
import { PaymentRequiredError } from "@muhkoo/connect";
try { await client.db.table("tasks").insert(row); }
catch (e) { if (e instanceof PaymentRequiredError) showUpgrade(e.code, e.upgradeUrl); else throw e; }
```

**`client.app.access()`** asks up front (`GET /api/app/access`):

```ts
const { paidAccountsOnly, allowed, reason, upgradeUrl } = await client.app.access();
// reason: one of the three codes above (only when !allowed); upgradeUrl: absolute http(s), or absent
```

Call it after sign-in and again when the user comes back from the portal (e.g. on
`visibilitychange`). It needs the app key and a session. An accelerator older than
the route answers **404** (`HttpError`) — catch and treat as allowed; the server
enforces the gate either way. Each `allowed: true` answer also sends any writes the
offline queue kept (below). For about a minute after a payment it can say `allowed`
while writes are still refused; ask again a minute later.

**Offline queue.** A queued write refused for payment is **kept**, not dropped, along
with every write queued after it (in order; deletes too), and the queue stops there.
`EventCore` emits `SYNC_ERROR` with `{ code, dropped: false }` (other 4xx refusals are
still dropped, `dropped: true`). `client.offline.queue.waiting()` lists the signed-in
user's waiting writes — use it, not `pending()`, for an "unsaved changes" badge.
`client.offline.resume()` sends them now; `client.app.access()` calls it on `allowed`.
The sync still ends with `SYNC_COMPLETE` while writes wait. **Never call
`client.app.access()` from a `SYNC_COMPLETE` handler**: each `allowed` answer starts
another sync, so the two would call each other.

Applied pattern: [api-payments.md](../scaffolds/api-payments.md).

## Hosting — every app gets a subdomain

Every app gets a DNS subdomain **`https://<slug>.apps.muhkoo.dev`** (the `<slug>` is the
app's slug). Deploy the built client there with `muhkoo deploy`
(`npm run deploy` wraps it) or the GitHub Action — no separate hosting account. Content-addressed
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
- A runtime `402` with a `code` is a different thing: a payment refusal for the
  **end user** or the app owner, not the developer's tier (see
  [Payments & access](#payments--access)).
