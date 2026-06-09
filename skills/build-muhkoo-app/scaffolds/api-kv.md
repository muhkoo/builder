# Scaffold: `client.kv` — per-user key/value

**Use when** you need **per-user private state synced across that user's devices** —
settings, drafts, last-read markers, onboarding flags. Per-user (scoped to the signed-in
identity), encrypted at rest by default, not shared between users.

> Reach for `client.kv` for *one user's* private state. For *shared* records use
> [`client.db`](./api-db.md); for files use [`client.storage`](./api-storage.md).

## The pattern

```ts
// Collections group keys (like a table). Values are JSON, encrypted at rest by default.
await client.kv.set("prefs", "ui", { theme: "dark", density: "comfortable" });
const prefs = await client.kv.get<UiPrefs>("prefs", "ui");   // → T | null
const ids   = await client.kv.list("drafts");                 // → string[]
await client.kv.delete("drafts", draftId);

// Cross-device realtime sync — the same user on another device sees changes live.
const off = client.kv.on("change", (e) => {
  // e: { collection, id, type: "set" | "delete", data }
  if (e.collection === "prefs") applyPrefs(e.data);
});
// …off() to unsubscribe
```

A tiny settings hook:
```tsx
function usePrefs() {
  const [prefs, setPrefs] = useState<UiPrefs | null>(null);
  useEffect(() => {
    client.kv.get<UiPrefs>("prefs", "ui").then(setPrefs);
    return client.kv.on("change", (e) => { if (e.collection === "prefs") setPrefs(e.data as UiPrefs); });
  }, []);
  const save = (p: UiPrefs) => { setPrefs(p); return client.kv.set("prefs", "ui", p); };
  return { prefs, save };
}
```

## Advanced — store a secret wrapped by the user's password

The chat app stores its encrypted ratchet keys in per-user storage **wrapped with the login
password** (defense in depth — even the encrypted-at-rest blob is password-sealed):

```ts
const wrapped = await wrapWithPassphrase(password, new TextEncoder().encode(JSON.stringify(secret)));
await client.kv.set("keys", "chat", wrapped);                 // on register
const blob = await client.kv.get("keys", "chat");             // on login
const secret = JSON.parse(new TextDecoder().decode(await unwrapWithPassphrase(password, blob)));
```

## Gotchas

1. **Per-user, requires an unlocked identity** (see [api-auth.md](./api-auth.md)) — it's
   keyed to the signed-in user; not for cross-user/shared data.
2. **`query()` isn't implemented** — use `list(collection)` + `get`, or model queryable data
   in `client.db`.
3. **If you wrap with the password, a wrong password = AES tag mismatch on unwrap.** Treat
   that as a login failure, not a recoverable error.
4. **`on("change")` is the cross-device sync** — handle remote `set`/`delete` so two devices
   stay consistent.

## See it in
`web/src/personal/spaceLoader.ts` (the password-wrapped secret pattern — adapt the
`client.kv` form above). Generic per-user state is lightly used in the current apps —
this is the canonical shape for settings/drafts/last-read going forward.
