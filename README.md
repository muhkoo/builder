# Muhkoo App Builder

A Claude Code plugin that turns an app idea into a working application on
[Muhkoo](https://muhkoo.dev) — end-to-end.

You describe what you want ("a shared task board where a team logs in, adds tasks,
and chats about them"). Claude designs the data model, **provisions** the backend
(app key, database tables, channels, agents, serverless functions), and **scaffolds**
a real Vite + React client wired to the [`@muhkoo/connect`](https://docs.muhkoo.dev)
SDK — with hosted sign-in ("Continue with Muhkoo"), the database, and realtime
channels already working.

## What you get

- **Hosted sign-in** out of the box — a "Continue with Muhkoo" button; passwords,
  passkeys, Google and recovery live on Muhkoo's sign-in page, and the server never
  sees a password (zero-knowledge underneath).
- **Paid-only apps handled** — if you switch on "Paid Muhkoo accounts only", or a
  payment is past due, the app shows an upgrade notice instead of failing silently.
- A **scalable database** with the tables your idea needs.
- Realtime **channels** (end-to-end-encrypted group messaging).
- Optionally, an **AI agent** that can act on your app (query/insert rows, post to
  channels) and **serverless functions** — on paid plans.
- A running React app you can `npm run dev` immediately.
- **Hosting** — every app gets a DNS subdomain `https://<slug>.apps.muhkoo.dev` and can
  be deployed there with one command (`npm run deploy`) or the bundled GitHub Action. No
  separate hosting account. On a paid plan, serve it on your **own domain** too (add it in
  the portal + two CNAMEs; the TLS cert is issued and renewed automatically).
- A **Cypress end-to-end suite** that drives the real backend (sign-in + DB + channel),
  so you can verify the built app actually works.
- A **distinctive UI** — the workflow runs a design pass with the `frontend-design`
  skill (preserving the test hooks), so apps don't ship the generic default look.

## Install

This repo is a Claude Code plugin **and** its own plugin marketplace. In Claude Code:

```
/plugin marketplace add muhkoo/builder
/plugin install muhkoo-app-builder@muhkoo
```

(`muhkoo/builder` is the GitHub repo; `muhkoo` is the marketplace name from
`.claude-plugin/marketplace.json`.) That's it — the `build-muhkoo-app` skill is now
available. To update later: `/plugin marketplace update muhkoo`.

**Try it locally first** (from a checkout):

```
/plugin marketplace add ./app-builder
/plugin install muhkoo-app-builder@muhkoo
```

Then just ask:

> Build me a team standup app on Muhkoo.

Claude auto-invokes the skill, asks a couple of clarifying questions, shows you the
design, provisions it, scaffolds + tests the client, and gives it a distinctive look.

## Layout

```
.claude-plugin/plugin.json     # plugin manifest (+ marketplace.json)
skills/build-muhkoo-app/
  SKILL.md                     # the workflow Claude follows
  references/                  # platform (SDK, routes, provisioning, decorators) + design pass
  scaffolds/                   # applied patterns per SDK surface + opt-in capabilities
  scripts/                     # extract-scaffold.mjs (harvest a scaffold from a build)
  templates/
    starter-app/               # Vite + React + @muhkoo/connect client + Cypress suite
    static-site/               # plain HTML/CSS/JS site, optional email-list function
examples/task-board/           # a complete worked app (design pass applied; suite green)
```

Provisioning, agent eject and hosting deploys run through the
[`@muhkoo/cli`](https://docs.muhkoo.dev/guides/cli/) (`muhkoo login` / `provision` /
`eject` / `deploy`).

## Companion skills

The workflow composes with two other skills when present:

- **`frontend-design`** — the design pass that gives each app a distinctive look
  (see `skills/build-muhkoo-app/references/design.md` for the preservation contract
  that keeps the Cypress hooks intact).
- The Cypress suite is built in; `frontend-design` is invoked during the scaffold step.

## Requirements

- A Muhkoo developer account (created automatically on first provision, or in the
  [portal](https://portal.muhkoo.dev)).
- Node 20+ (for the `muhkoo` CLI and the Vite toolchain).
- Agents and serverless functions require a **paid** plan; database, channels, auth,
  and storage work on the free tier.

## License

MIT
