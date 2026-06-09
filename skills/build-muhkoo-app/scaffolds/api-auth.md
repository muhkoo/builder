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

## See it in
`web/src/auth/AuthContext.tsx` (mature: identity persistence + onSessionExpired),
`discord-clone/src/auth/AuthContext.tsx` (the `needsUnlock` gate),
`task-board` / starter template `src/auth/AuthContext.tsx` (the simplest version).
