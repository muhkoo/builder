# Scaffold: `client.storage` — encrypted file sharing

**Use when** users upload/share files or images (attachments, avatars, documents). Files
are chunked, erasure-coded, and AES-encrypted client-side; you get an opaque **manifest**
to share. Sources: **discord-clone** `features/ChatView.tsx` (attachments) + **web**
chat file sharing.

## Upload — write to a Space, get a manifest, send it

```ts
// 1) Resolve the space id you're uploading into (files are encrypted per-Space).
const spaceId = await client.space.resolveChannel(channelName); // or the Space's id
const data = new Uint8Array(await file.arrayBuffer());

// 2) Write the file (chunk + RS-encode + encrypt). Optionally track progress.
const { manifest } = await client.storage.writeFile({
  spaceId,
  data,
  metadata: { name: file.name, type: file.type || "application/octet-stream" },
});

// 3) Share the manifest as a message in the channel (it's the capability to read the file).
await space.sendMessage({ _t: "file", manifest }, { channel: channelName });
```

For a good UX, show an **optimistic placeholder** with progress, then remove it (the real
file message arrives via fan-out loopback):

```ts
const { manifest } = await space.putFile(file, { name: file.name, type: file.type }, {
  onProgress: (done, total) => setProgress(total ? done / total : 0),
});  // web uses space.putFile (Space-attached); client.storage.writeFile is the standalone form
```

## Download — read by manifest

```ts
// A holder of the manifest can read the file from anywhere — confidentiality is the
// encryption + manifest secrecy, not access control on the bytes.
const { data } = await client.storage.readByManifest(manifest);  // → Uint8Array (decoded + decrypted)
const url = URL.createObjectURL(new Blob([data], { type: meta.type }));
// …<img src={url}> / download link. Revoke the object URL on unmount.
```

## File message envelope

Detect file messages by a marker key and read the manifest off the body:

```ts
// when sending:  { _t: "file", manifest }            (or discord-clone's { kind: "file", file: { manifest, name, type, size } })
// when reading:  if (body._t === "file") render <FileBubble manifest={body.manifest} />
```

## Gotchas

1. **The manifest is opaque + load-bearing.** Don't inspect or mutate it — store it as-is and
   pass it back to `readByManifest`. It carries the per-chunk keys + shard hashes.
2. **Files are Space-scoped on write.** You need the `spaceId` to `writeFile`. Reads only
   need the manifest (globally fetchable, decrypted via the manifest's keys).
3. **Chunking is automatic.** Pass raw bytes; the SDK chunks/encodes/retries.
4. **No local echo** (same as text) — the file message loops back; dedup by handle, don't
   double-render. Show an uploading placeholder until it does.
5. **Revoke object URLs** (`URL.revokeObjectURL`) on unmount to avoid leaks.

## See it in
`discord-clone/src/features/ChatView.tsx` (`attach()` write + `FileBubble` read via
`readByManifest`), `web` chat file-sharing (progress placeholder + `{ _t: "file" }` envelope).
