# Scaffold: `client.auth.hosted` — hosted authentication

**Use when:** you want sign-in without embedding any login UI or the proving
circuits (~6 MiB). The app redirects to the Muhkoo-hosted sign-in page
(`auth.muhkoo.dev`), which owns register / sign-in / recovery and every factor
(password, passkey, email, Google) — and calls you back with a session + the
master seed. This is the **default** for new scaffolds; embedded ZK auth
(`api-auth.md`) is the alternative when you want the login UX fully in-app.

## The pattern

One button + one bootstrap. The app is a single page, so the callback lands on
the app root and `isCallback()` detects it (no dedicated route needed).

```ts
// lib/client.ts — set authBaseUrl only to OVERRIDE (staging/dev); the SDK
// defaults to auth.muhkoo.dev.
new Client({ baseUrl, apiKey, authBaseUrl: authBaseUrl() || undefined });

// auth/AuthContext.tsx — on load:
if (client.auth.hosted.isCallback()) {
  const { username } = await client.auth.hosted.handleCallback(); // exchange + unseal
  setUsername(username);
} else {
  const user = await client.auth.zk.restore();
  if (user && client.auth.zk.identity) setUsername(user.username); // unlocked session
}

// the "Continue with Muhkoo" button:
await client.auth.hosted.login({ appId, redirectUri: window.location.origin });
```

## Setup (one-time, in the portal)

1. Open your app in the developer portal → **App Detail → Hosted sign-in**.
2. Add your callback URL — for this single-page template it's the app's **origin**
   (e.g. `https://yourapp.apps.muhkoo.dev`, and `http://localhost:5173` for dev).
   Exact match; https only (localhost may use http). No wildcards.
3. Copy the **app id** → `VITE_MUHKOO_APP_ID`.

## How it works (sealed-seed handoff)

The master seed can't go on the wire server-readable. So the hosted page seals
it under a one-time key, puts the key **only in the URL fragment** (`#k=…`, which
never reaches a server), and hands back a single-use code. `handleCallback()`
exchanges the code (PKCE), reads the key from the fragment, decrypts the seed,
and scrubs the URL. Trust-equivalent to deriving the key in-app — but the
credentials are only ever typed on the Muhkoo origin.

## Gotchas

- **Identity vs. session.** A signed-in session and an *unlocked* identity are
  different. `handleCallback()` establishes both. After a page reload the session
  restores but the seed isn't persisted — gate "signed in" on
  `client.auth.zk.identity` and prompt a one-tap re-sign-in when it's missing.
- **Same `seedBase64`, `token`, `commitment`.** Everything downstream
  (`client.db`, `client.kv`, channels, per-user encryption) is identical to
  embedded auth — only the login UI moved.
- **`authBaseUrl` default.** Don't hard-code `auth.muhkoo.dev`; pass `authBaseUrl`
  only to override for staging (`auth.staging.muhkoo.dev`).
- **E2E tests.** Sign-in is a cross-origin redirect, so a test runner can't walk
  it in-app. Assert the button starts the redirect, and inject a session
  programmatically for authenticated specs.
