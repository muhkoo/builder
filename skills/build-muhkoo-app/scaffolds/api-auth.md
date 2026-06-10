# Scaffold: `client.auth` — ZK authentication

**Use when** the app has users (almost always). Passwordless on the server — the
password derives a zero-knowledge identity client-side; the server only ever sees a
commitment. Pattern proven in `web`, `discord-clone`, `standup`, `task-board`.

## The pattern — a React context over `client.auth.zk`

```tsx
// src/auth/AuthContext.tsx
export function AuthProvider({ children }) {
  const [username, setUsername] = useState<string | null>(null);
  const [commitment, setCommitment] = useState<string | null>(null); // the stable user id (row-scoping key)
  const [ready, setReady] = useState(false);       // restore finished
  const [needsUnlock, setNeedsUnlock] = useState(false); // session restored but identity locked

  // Restore a persisted session on load.
  useEffect(() => {
    (async () => {
      try {
        const zk = getClient().auth.zk;
        const user = await zk.restore();           // → AuthUser | null
        if (user) {
          setUsername(user.username);
          setCommitment(user.commitment);
          if (!zk.identity) setNeedsUnlock(true);  // token survived, in-memory identity didn't
        }
      } finally { setReady(true); }
    })();
  }, []);

  async function register(u, p, email?) {
    await getClient().auth.zk.register({ username: u, password: p, email: email ?? null, login: false });
    await getClient().auth.zk.login(u, p);         // login unlocks the identity for crypto
    const user = getClient().auth.zk.user!;
    setUsername(user.username); setCommitment(user.commitment); setNeedsUnlock(false);
  }
  async function login(u, p)  { const user = await getClient().auth.zk.login(u, p); setUsername(user.username); setCommitment(user.commitment); setNeedsUnlock(false); }
  async function unlock(p)    { await getClient().auth.zk.unlock(p); setNeedsUnlock(false); } // re-derive identity without re-login
  async function logout()     { await getClient().auth.zk.logout(); setUsername(null); setCommitment(null); }

  // Mid-session expiry the SDK can't self-heal → log out (or prompt re-auth).
  useEffect(() => getClient().onSessionExpired(() => void logout()), []);
  // …expose { username, commitment, ready, needsUnlock, register, login, unlock, logout }
}
```

Gate the app: `!ready` → spinner; `needsUnlock` → an unlock screen (`unlock(password)`);
`!username` → the auth screen; else the app.

## Gotchas (battle-tested)

1. **Identity ≠ session.** `client.auth.zk.token` (persisted) and `client.auth.zk.identity`
   (in-memory keypair) are separate. After `restore()` the token can be present but the
   identity **locked** — encryption/messaging (`client.space`, `client.storage`) fail until
   you `unlock(password)` (or re-`login`). Gate E2E features on the identity being unlocked.
2. **`restore()` does not unlock.** It validates the token only. Track `needsUnlock`.
3. **`commitment` is your row-scoping key.** It's the stable user id; store DB rows with an
   `owner: commitment` column and filter by it (see [api-db.md](./api-db.md)). Display the
   `username`; scope by the `commitment`.
4. **Wrong password → commitment mismatch.** A wrong password derives a different identity →
   the server rejects it. Surface a friendly "wrong password", don't auto-retry.
5. **`onSessionExpired`** fires when the SDK can't silently re-auth — wire it to logout/re-auth.
6. **`VaultUnavailableError` ≠ wrong password.** `login()` / `unlock()` throw the exported
   `VaultUnavailableError` when the recovery vault is unreachable (network / 5xx / rate-limit).
   Catch it separately and surface "couldn't reach the server, retry" — **don't** tell the user
   their password is wrong (a real wrong password is a commitment mismatch, gotcha #4).

## Account recovery & passkeys

The password is a **factor**, not the source of keys: a random master seed (same `commitment`,
backward-compatible) is wrapped per factor in a server-blind vault. This makes accounts
**un-lose-able** — offer it. Build a small **Security** surface (signed-in) plus a
**Forgot password** flow on the auth screen.

```ts
const zk = getClient().auth.zk;

// — Passwordless sign-in with a passkey (on the auth screen) —
//   Only show the button when WebAuthn + PRF are actually usable here.
const canPasskey = zk.passkeyAvailable() && (await zk.passkeyPrfAvailable()) !== false;
if (canPasskey) {
  const user = await zk.loginWithPasskey(username); // → AuthUser, identity unlocked
}

// — Security surface (signed-in) —
await zk.enrollPasskey({ label: "MacBook" });        // wrap the seed under a new passkey
const phrase = await zk.enrollRecoveryPhrase();      // 24-word BIP39, show ONCE then forget it
await zk.changePassword(newPassword);                // rotate password; commitment never moves
const factors = await zk.listFactors();              // [{ id, type, label?, createdAt? }]
await zk.removeFactor(factors[0].id);                // can't remove the last one

// — Forgot password (on the auth screen) —
const user = await zk.recoverWithPhrase(username, mnemonic); // → AuthUser
await zk.changePassword(newPassword);                // then set a fresh password
```

### Recovery gotchas

1. **`passkeyPrfAvailable()` can be `null`** (undeterminable). Treat `null` like `false` and
   **hide** the passkey option — don't offer a passkey path you can't guarantee works.
2. **The recovery phrase is shown exactly once.** It *is* the seed; nothing is stored
   server-side. Render it in a copy-once dialog and make the user confirm they saved it.
3. **`recoverWithPhrase` doesn't set a password.** It's the forgot-password path — follow it
   with `changePassword(new)` so the user can sign in normally next time.
4. **You can't remove the last factor.** `removeFactor` rejects it — keep at least one.

### Wrap app data to the seed, not the password (REQUIRED if you encrypt per-user data)

If the app encrypts per-user data itself — chat ratchet keys, KV secrets, anything keyed off
the password — **re-key it to `client.auth.zk.seedBase64`** (the master seed as base64; `null`
when locked). The seed is stable across password changes **and** is present under passwordless
passkey login, so password-wrapped data would otherwise be unrecoverable after a rotation or a
passkey sign-in.

```ts
const seed = getClient().auth.zk.seedBase64; // null when locked — gate on it
// derive your data-encryption key from `seed`, not from the password

// One-time migration, on the next password login (you have both secrets in hand):
async function unwrapAppKey(blob, seedSecret, password) {
  try {
    return await unwrap(blob, seedSecret);          // already seed-wrapped → done
  } catch {
    const key = await unwrap(blob, password);        // legacy: password-wrapped
    await store(await wrap(key, seedSecret));        // re-wrap under the seed, persist
    return key;
  }
}
```

## See it in
`web/src/auth/AuthContext.tsx` (mature: identity persistence + onSessionExpired),
`discord-clone/src/auth/AuthContext.tsx` (the `needsUnlock` gate),
`task-board` / starter template `src/auth/AuthContext.tsx` (the simplest version).
