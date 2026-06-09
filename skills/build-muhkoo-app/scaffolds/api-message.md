# Scaffold: `client.message` — pub/sub + direct messages

**Use when** you need **low-latency realtime signals that don't need history or
encryption** — presence ("who's online"), typing, cursors, live counters — or
**end-to-end-encrypted direct messages** between two users. Source: **discord-clone**
`lib/presence.ts` (presence) + `client.message.send` for DMs.

> For persisted, encrypted *group* conversation use [`client.space`](./api-space.md). Use
> `client.message` for the ephemeral/plaintext layer and 1:1 DMs.

## Plaintext pub/sub — presence via heartbeat + GC

```ts
const subject = `presence-${serverId}`;
const seen = new Map<string, { name: string; lastSeen: number }>();

const sub = client.message.subscribe<Ping>(subject, (e) => {  // e: { subject, from, data }
  const p = e.data;
  seen.set(p.id, { name: p.name, lastSeen: Date.now() });
  setOnline(new Map(seen));
  if (p.kind === "hi" && p.id !== myId()) {                   // new peer said hi → reply so they see us
    void client.message.publish(subject, { id: myId(), name: myName(), kind: "beat" });
  }
});

void client.message.publish(subject, { id: myId(), name: myName(), kind: "hi" }); // announce
const hb = setInterval(() => void client.message.publish(subject, { id: myId(), name: myName(), kind: "beat" }), 15_000);
// …on a timer, drop members whose lastSeen is older than ~30s; cleanup: clearInterval(hb); sub.unsubscribe();
```

## Direct messages (E2E-encrypted 1:1)

```ts
const sub = client.message.subscribe(`user:${myCommitment}`, (e) => addDm(e.from, e.data));
await client.message.send(`user:${theirCommitment}`, { contents: text });
```

## Gotchas

1. **Plaintext + no history.** `publish`/`subscribe` is an unencrypted relay; late joiners
   miss everything. Perfect for presence/typing (stale data is GC'd), wrong for anything you
   need to retrieve later — use the DB or a Space.
2. **Deterministic subjects.** Both ends must `subscribe`/`publish` the same subject string
   (`presence-${serverId}`, `user:${commitment}`), or they never see each other.
3. **Heartbeat + lastSeen** is the presence idiom — no "who's online" API call; peers announce
   and you expire the silent ones.
4. **`send` (DM) IS encrypted**; `publish` is NOT. Don't mix them up for sensitive data.

## See it in
`discord-clone/src/lib/presence.ts` (full presence/heartbeat/GC). Note: in-channel typing in
both apps actually rides `space.sendEphemeral` (see [api-space.md](./api-space.md)) — reach
for `client.message` when the signal isn't scoped to one Space.
