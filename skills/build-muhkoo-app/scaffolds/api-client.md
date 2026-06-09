# Scaffold: the `Client` — construction + base URL

**Use when** wiring any app to `@muhkoo/connect` (the foundation every other API scaffold
assumes). One lazily-constructed singleton; every feature calls `getClient()`.

## The pattern — a lazy singleton

```ts
// src/lib/client.ts
import { Client } from "@muhkoo/connect";

let _client: Client | null = null;
export function getClient(): Client {
  if (_client) return _client;
  _client = new Client({
    baseUrl: baseUrl(),                              // resolved at first use (not module-load)
    apiKey: import.meta.env.VITE_MUHKOO_KEY || undefined, // publishable key (mk_*_pk_*), ok in the bundle
  });
  return _client;
}
```

```ts
// src/lib/config.ts — base URL: explicit env, else same-origin
export function baseUrl(): string {
  return (import.meta.env.VITE_WORKER_URL || "").replace(/\/+$/, "") || window.location.origin;
}
```

`ClientOptions`: `{ apiKey?, baseUrl?, circuits?, sessionStore?, fetch?, logLevel? }`. In the
browser the SDK defaults `sessionStore` to localStorage (sessions survive reloads) and derives
the ZK circuit URLs from `baseUrl` — leave both unless you have a reason.

## Gotchas

1. **Lazy on purpose.** Build on first `getClient()`, not at import — lets tests/envs inject a
   `baseUrl` first.
2. **Publishable key only in the bundle.** Ship `mk_*_pk_*` (browser-safe); the secret key
   `mk_*_sk_*` is server-side only (deploys, functions).
3. **Base URLs:** `https://api.muhkoo.dev` (prod) / `https://api.staging.muhkoo.dev` (staging) /
   `http://localhost:8787` (local). The SDK derives REST, WebSocket, and circuit endpoints from
   the one `baseUrl`.

## See it in
`web/src/lib/client.ts` + `src/api/config.ts`; every example app's `src/lib/client.ts`.
