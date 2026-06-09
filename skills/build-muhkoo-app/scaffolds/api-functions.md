# Scaffold: `client.functions` — serverless functions (paid)

**Use when** the app needs **server-side logic**: a webhook/HTTP endpoint, or code that
runs automatically on channel messages (a bot, a moderator, an integration). Your code
runs as an isolated per-app edge Worker. This is a **management/authoring** API
(deploy-time), not a client runtime call — the frontends we've built don't call
`client.functions` directly; functions are deployed via the provision spec or the portal.

## Author — a Worker module

A function is an ES module Worker. HTTP functions return a `Response`; Space-triggered
functions get the message and can act:

```js
export default {
  async fetch(request, env) {
    // env has MUHKOO_API_URL, MUHKOO_APP_ID, MUHKOO_APP_ENV, MUHKOO_FUNCTION_ID,
    // MUHKOO_API_KEY — call back into your app's data plane with the app key.
    if (request.method === "POST") {
      const body = await request.json();
      // …do work; e.g. fetch(`${env.MUHKOO_API_URL}/api/db/tasks`, { headers: { "X-Muhkoo-Key": env.MUHKOO_API_KEY }})
      return Response.json({ ok: true });
    }
    return new Response("hello from your Muhkoo function");
  },
};
```

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
4. **Call back with the app key**, not a user session — `env.MUHKOO_API_KEY` + the
   `X-Muhkoo-Key` header hit your app's data plane.

## See it in
The provision spec `functions[]` (provisioning.md) and the portal Functions editor. (No
frontend `client.functions` usage in the example apps — it's management/authoring.)
