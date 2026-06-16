# Scaffold: `client.functions` — serverless functions (paid)

**Use when** the app needs **server-side logic**: a webhook/HTTP endpoint, code that
runs automatically on channel messages (a bot, a moderator, an integration), or a
**secret-holding API proxy** (verify the caller's session, then call a third-party or
privileged API with a key the browser must never see). Your code runs as an isolated
per-app edge Worker. Deploying is a **management/authoring** call (provision spec /
portal / `client.functions.deploy`); *invoking* an HTTP function from the frontend is
`client.functions.invoke({ name, slug }, { body })` — it attaches `X-Muhkoo-Key` and
the signed-in user's `X-Muhkoo-Session` automatically.

## Author — a Worker module

A function is an ES module Worker. HTTP functions return a `Response`; Space-triggered
functions get the message and can act:

```js
export default {
  async fetch(request, env) {
    // env has MUHKOO_API_URL, MUHKOO_APP_ID, MUHKOO_APP_ENV, MUHKOO_FUNCTION_ID,
    // MUHKOO_APP_KEY — plus MUHKOO_API, a SERVICE BINDING to the platform API.
    // ALWAYS call the platform through the binding, never plain fetch() —
    // worker-to-worker HTTP on the same account is blocked by Cloudflare (522):
    const api = (path, init) => env.MUHKOO_API.fetch(env.MUHKOO_API_URL + path, init);

    if (request.method === "POST") {
      const body = await request.json();
      // e.g. api(`/api/db/tasks`, { headers: { "X-Muhkoo-Key": env.MUHKOO_APP_KEY } })
      return Response.json({ ok: true });
    }
    return new Response("hello from your Muhkoo function");
  },
};
```

### Verifying the caller (the auth-gated proxy pattern)

`client.functions.invoke` passes the user's session token through to your function as
`X-Muhkoo-Session` — **unverified**. To act on the caller's identity, verify it
server-side and never trust anything client-supplied:

```js
const r = await api("/api/auth/verify", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ token: request.headers.get("X-Muhkoo-Session") }),
});
const { commitment } = r.ok ? await r.json() : {};
if (!ALLOWED.has(commitment)) return Response.json({ error: "Not authorized" }, { status: 403 });
```

The function also **owns its CORS** — handle `OPTIONS` and set
`Access-Control-Allow-Origin`/`-Headers` (`Content-Type, X-Muhkoo-Session, X-Muhkoo-Key`)
on every response, or the browser can't call it. See it real: `account-mgmt`'s
`functions/admin.fn.js`.

## Deploy — via the provision spec (or `client.functions.deploy`)

Add to the provision spec's `functions[]` (see provisioning.md):

```jsonc
{
  "name": "webhook",                 // DNS-safe slug
  "displayName": "Webhook",
  "code": "export default { async fetch(request){ return new Response('hi'); } };",
  "triggers": {
    "http": { "enabled": true, "methods": ["GET", "POST"] },   // → <name>--<slug>.fns.muhkoo.dev
    "space": { "match": [{ "type": "keyword", "pattern": "deploy" }] } // run on matching channel messages
  },
  "caps": { "cpuMs": 50, "subRequests": 10, "dailyInvocationBudget": 10000 }
}
```

Equivalent SDK: `client.functions.deploy(appId, { name, displayName, code, triggers, caps })`;
`client.functions.enable(appId, functionId, spaceId)` to arm a Space trigger on a channel.

## Triggers

- **HTTP** — gets a URL `<name>--<slug>.fns.muhkoo.dev`; call it from anywhere.
- **Space** — runs on messages in an enabled channel that match (`keyword` / `regex` /
  `always`). Enable it on the channel after the channel exists (like agents).

## Gotchas

1. **Paid-tier only** — deploy returns `402` on a free account.
2. **Space-trigger ≠ agent.** A Space-bound function with an `always` trigger auto-replies to
   *every* message, independent of any agent. If it's noisy, disable it in the Functions tab —
   not the agent.
3. **It's a Worker, not Node.** Use the Workers runtime (`fetch`, Web APIs); no Node built-ins.
   Caps (`cpuMs`, `subRequests`, daily budget) are enforced — keep work bounded.
4. **Call back with the app key**, not a user session — `env.MUHKOO_APP_KEY` + the
   `X-Muhkoo-Key` header hit your app's data plane.
5. **Plain `fetch()` to the platform 522s.** The fns.* host shares the API's zone and
   account, and Cloudflare blocks same-account worker-to-worker HTTP. Use the
   `env.MUHKOO_API` service binding for every platform call (external third-party URLs
   are fine with plain `fetch`).
6. **Secrets-in-source placeholders.** Function source is encrypted at rest, so embedding
   a secret is acceptable — but keep the COMMITTED file a placeholder and substitute from
   env into a gitignored spec at provision time (`replaceAll`, not `replace` — the
   placeholder usually also appears in the doc comment). See `account-mgmt/scripts/make-spec.mjs`.

## See it in
The provision spec `functions[]` (provisioning.md), the portal Functions editor, and the
`account-mgmt` app (auth-gated admin proxy: allowlist + secret + CORS + `invoke()` client).
