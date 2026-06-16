# Scaffolds — composable blueprints

Scaffolds are small, focused **blueprints** for capabilities an app might need but
that don't belong in every app. The starter template is the lean baseline (auth, DB,
channel, responsive); a scaffold is an *opt-in* add-on you apply **only when the app
calls for it** — so the baseline stays small and apps get exactly what they need.

Each scaffold is a single markdown file: **when to use it**, **what it adds**, the
**exact edits/snippets**, and any **contract** (what must stay intact — e.g. `data-cy`
hooks, responsiveness). Apply one by following its steps against the scaffolded app.

## How to use (in the build workflow)

During/after scaffolding (SKILL step 4), look at what the app needs and apply the
matching scaffolds. Read the scaffold file, make its edits, then re-run the Cypress
suite (`npm run test:e2e`) — a scaffold must never break the existing tests.

## API scaffolds — how we actually use each `@muhkoo/connect` API

One per SDK surface, with the real, battle-tested pattern + gotchas distilled from our
apps (`web` chat, `discord-clone`, `standup`, the `task-board` example). These complement
[references/platform.md](../references/platform.md) (the signatures) with *applied* code.

| Scaffold | Use when |
| --- | --- |
| [api-client.md](./api-client.md) | Always — the `Client` singleton + base-URL/app-key wiring every app needs. |
| [api-auth.md](./api-auth.md) | The app has users — ZK register/login/restore/unlock, the `ready`/`needsUnlock` gate, `commitment` as the row-scoping id. |
| [api-db.md](./api-db.md) | Persistent records (lists, tracked items) — the typed-helper layer over `client.db.table()`, real queries + pagination + the `owner`-scoping rule. |
| [api-space.md](./api-space.md) | Realtime E2E-encrypted channels (chat/feeds) — **the keyring handshake** (wait-for-key), history, edit/delete, the `ready` gate. |
| [api-message.md](./api-message.md) | Ephemeral/plaintext signals (presence, typing, cursors) or **1:1 DMs** (`client.message`). |
| [api-storage.md](./api-storage.md) | File/image upload + sharing — `writeFile`→manifest, `readByManifest`, the file-message envelope. |
| [api-kv.md](./api-kv.md) | Per-user private state synced across the user's devices — settings, drafts, last-read. |
| [api-agents.md](./api-agents.md) | An AI "virtual user" that reads/replies + acts on the app (paid) — the `@Muhkoo*` decorate→eject→provision flow. |
| [api-functions.md](./api-functions.md) | Server-side logic — an HTTP webhook or message-triggered code, as an isolated edge Worker (paid). |

## Capability scaffolds

| Scaffold | Use when |
| --- | --- |
| [pwa.md](./pwa.md) | The app should be **installable** / run standalone on a phone (PWA): web manifest, service worker, install meta, and **safe-area** handling so content clears the notch / home indicator. |

## Template scaffolds

A whole **template choice** rather than an add-on (pick it at SKILL "Choosing a template").

| Scaffold | Use when |
| --- | --- |
| [static-site.md](./static-site.md) | The idea has **no logged-in users** — landing page, marketing site, docs, portfolio. The `templates/static-site` template: plain HTML/CSS/JS (no auth/SDK/ZK), hosted at `<slug>.apps.muhkoo.dev`, with an optional email-list function. |

## Adding a scaffold

Don't hand-author from scratch — **extract one from a finished build**. After a build
session reworks an idea into a real, green app, distill the reusable pattern back into a
scaffold so the next build starts ahead. The helper generates the skeleton in the
canonical shape **and** captures the build's reworked spec as a reusable seed
(`seeds/<name>.spec.json`):

```bash
node ../scripts/extract-scaffold.mjs --name <kebab> --kind api|capability \
  --from <built-app-dir>
```

Then fill in `<name>.md` from the real code and add a row to the table above. Full
procedure: [references/extracting-scaffolds.md](../references/extracting-scaffolds.md).
Good candidates: dark-mode toggle, file upload (`client.storage`), infinite-scroll
lists, push notifications, optimistic updates, an empty/loading-state kit.
