# Design guide: idea → Muhkoo architecture

How to turn a plain-language app idea into a concrete Muhkoo design before provisioning.
Produce a short, explicit spec and **show it to the user** before creating anything.

## The five questions to resolve (ask only what the idea leaves unclear)

1. **Who logs in?** Almost always yes → ZK auth. (One personal-use app with no sharing
   could skip multi-user concerns, but auth is still the front door.)
2. **What persistent records exist?** → `client.db` tables. Name the entities and their
   fields.
3. **Is there realtime / shared conversation or a live feed?** → a `client.space`
   channel (E2E-encrypted group messaging with history).
4. **Is there per-user private state** (preferences, drafts, a personal list)? →
   `client.kv`. Files/attachments? → `client.storage`.
5. **Is there an AI assistant** that should read messages and act on the app? → a
   programmable **agent** (paid). Background/scheduled or HTTP webhook logic? → a
   **serverless function** (paid).

## Mapping rules of thumb

| In the idea you hear… | Muhkoo primitive |
| --- | --- |
| "a list of X", "track Y", "records", "history of" | a `db` **table** |
| "chat", "channel", "feed", "comments", "realtime", "see updates live" | a `space` **channel** |
| "my settings", "draft", "private notes", "saved per user" | `kv` |
| "upload", "attach", "image", "document" | `storage` |
| "assistant", "bot", "ask it to…", "@mention" | an **agent** with tools |
| "webhook", "on a schedule", "when X happens, do Y server-side" | a **function** |

## Designing a table

For each entity produce a `DbTableSpec` (see provisioning.md for the exact shape):

- Pick columns + types (`text | integer | real | boolean | timestamp | json`).
- Add `created_at` (timestamp) for ordering; index columns you'll filter/sort on.
- Stamp an `owner` (text = the user's `commitment` or username) when rows belong to a
  user, so the client can scope queries. (Row-level auth is app-enforced in v1 — the
  data plane is keyed by the app, not per-user; filter by `owner` in queries.)
- Don't set a primary key unless you have a natural one — let the server add `_id`.

## Designing a channel

- Most apps need exactly one channel (e.g. `general`) to start. Multi-room apps create
  channels per topic/team.
- The client creates/joins channels at runtime (`createChannel` / `joinChannel`). You
  generally **don't** pre-provision channels; you provision the *agent/function* and then
  enable it on the channel's `spaceId` once it exists.

## Designing an agent (paid)

- Write a `@Muhkoo*`-decorated description class (see decorators.md), eject the prompt +
  tools, create the agent, then enable it on the channel.
- Default to **read-only** db access unless the app clearly wants the agent to write.
- Give the agent only the tables/functions/channels it needs — the allowlist is the
  security boundary.

## Output of the design step

A short spec the user signs off on, e.g.:

```
App: Team Standup   slug: team-standup
Auth: ZK (register/login)
DB tables:
  tasks(title:text!, done:boolean! =false, owner:text, created_at:timestamp!)  idx(done)
Channels: general (created at runtime)
Agent (paid): @helper — read tasks, post to general, trigger on @mention
Functions: none
Client: Vite + React + @muhkoo/connect — auth screen, tasks board, general chat
```

Keep it this terse. Then provision in the order: app → tables → (agent/function) →
enable-on-channel (after the client has created the channel).

## Scope discipline

Start with the smallest design that demonstrates the idea end-to-end: auth + one table +
one channel. Add agents/functions only if the idea genuinely needs them and the account
is paid. You can always provision more later — tables via additive PUT, agents/functions
via new create calls.
