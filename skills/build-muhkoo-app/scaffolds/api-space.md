# Scaffold: `client.space` — E2E-encrypted channels

**Use when** the app has realtime, shared, end-to-end-encrypted conversation (chat,
feeds, comments, presence rooms). The single hardest-to-get-right API — the **keyring
handshake** is the crux. Canonical source: **web** `src/hooks/useChatChannel.ts` (the most
complete); **discord-clone** `lib/spaces.ts` (a clean join-or-create cache).

## The lifecycle — resolve → connect → **key** → stream

A channel is a named Space sealed with a shared group key the server never sees. A new
member must be **admitted to the keyring** before they can send or read. You cannot skip
this: until `keyring.hasAnyKey()` is true, `sendMessage` silently fails.

```ts
// Open (join, or create on first run), then WAIT FOR THE KEY.
async function openChannel(name: string) {
  let space;
  try { space = await client.space.joinChannel(name); }   // existing channel
  catch { space = await client.space.createChannel(name); } // first time → create

  // joinChannel runs the handshake, but make the keyed state explicit + robust:
  const keyring = space.keyring;
  try { await keyring?.loadFromCache(); } catch { /* returning member cache */ }
  if (keyring && !keyring.hasAnyKey()) {
    await keyring.requestKey();                  // queue an admission request (returns immediately)
    const deadline = Date.now() + 25_000;
    while (!keyring.hasAnyKey() && Date.now() < deadline) {
      try { await keyring.pullKeys(); } catch { /* keep waiting */ } // POLL — not requestKey again
      if (keyring.hasAnyKey()) break;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  if (keyring && !keyring.hasAnyKey()) throw new Error("could not obtain channel key");
  return space; // now keyed — safe to send/read
}
```

Wire events **before** sending; gate the composer on a `ready` (keyed) flag:

```ts
const unsub = space.onMessage((e) => addMessage(e));      // e: { from, handle, message }
space.onMessageEdited?.((e) => applyEdit(e));
space.onMessageDeleted?.((e) => applyDelete(e.handle));
const { messages } = await space.history({ limit: 100 }); // newest-first — reverse for display

// Send / edit / delete — only when connected AND keyed:
if (space.isConnected() && space.keyring?.hasAnyKey()) {
  await space.sendMessage({ contents: text }, { channel: name });
  await space.editMessage(handle, { contents: text, edited: true }, { channel: name });
  await space.deleteMessage(handle);
}
```

**Message body convention:** send a small object, e.g. `{ contents: "hi" }`; read it back at
`e.message.body.contents`. File messages ride as `{ _t: "file", manifest }` (see
[api-storage.md](./api-storage.md)). **Avoid the reserved keys** `body`, `id`, `timestamp`,
`status`, `checksum` in your message object — the SDK's Message unwraps anything with a
`body` key and these collide.

## Gotchas (hard-won)

1. **Wait for the key.** Reporting "connected" on WS-connect and sending before
   `keyring.hasAnyKey()` is the #1 bug — the send throws silently, message never appears.
   Poll `pullKeys()` (NOT `requestKey()` again) until keyed; gate send on a `ready` flag.
2. **No local echo.** The fan-out loops your own message back; render that. Dedup by
   `e.handle` (the server's stable storage id) so the loopback isn't doubled.
3. **History is newest-first** — reverse before rendering chronologically. Edits/deletes are
   already applied in history.
4. **Channel names must be deterministic** across clients (e.g. `c-${channelId}`), or two
   clients open different Spaces and never converge.
5. **Cache the Space per name** (a `Map<name, Promise<Space>>`) and `disconnect()` on
   teardown — don't reopen on every render.

## Typing / presence (ephemeral, not persisted)

```ts
space.sendEphemeral("typing", { name: myName() });        // low-latency, no history
space.onEphemeral((e) => { if (e.subject === "typing") markTyping(e.from); });
// expire stale indicators on a ~2s timer (TTL ~5–6s)
```

## See it in
`web/src/hooks/useChatChannel.ts` (full: keying + history + edit/delete + typing + roster
via `BroadcastChannelEvents.RAW_FRAME`), `discord-clone/src/lib/spaces.ts` (the join-or-create
cache + `awaitKey` poll) and `features/ChatView.tsx`.
