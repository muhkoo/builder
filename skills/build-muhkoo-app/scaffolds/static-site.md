# Scaffold: static website (`templates/static-site`)

**Use when** the idea has **no logged-in users** — a landing page, marketing site,
docs, portfolio, or any mostly-static site. Unlike the `starter-app` template (full
ZK auth + DB + channels), the static template ships **plain HTML/CSS/JS** (Vite), no
`@muhkoo/connect`, and no ZK in the browser. It still deploys to Muhkoo hosting at
`<slug>.apps.muhkoo.dev` and can call **one optional serverless function**.

This is a **template choice**, not an add-on you apply to the starter app — pick it
at SKILL step "Choosing a template".

## What it is

```
templates/static-site/
├── index.html              # the page (+ an optional, hidden-by-default signup form)
├── src/main.js             # only dynamic behavior: the email form → subscribe fn
├── src/style.css           # clean baseline styles (restyle in the design pass)
├── vite.config.js          # no wasm/polyfill plugins — it's a static site
├── functions/subscribe.js  # optional Muhkoo email-list function (paid tier)
├── .github/workflows/deploy.yml   # CI: build + `muhkoo deploy`
└── .env.example            # VITE_SUBSCRIBE_URL (only if using the function)
```

## Build & deploy

```bash
npm install          # NOT --install-links — there's no file: SDK dep
npm run dev          # http://localhost:5173
npm run deploy       # MUHKOO_DEPLOY_KEY=mk_*_sk_*  MUHKOO_APP_ID=<id>  → dist/ to hosting
```

## Email list (optional)

`functions/subscribe.js` accepts `POST { email }` and stores it in a Muhkoo
`subscribers` table via the `MUHKOO_API` service binding — self-contained, no
external services or secrets in the default path. To enable:

1. Provision a `subscribers` table (`tables[]`) + the `subscribe` function
   (`functions[]`, HTTP trigger — paid tier) via the provision spec.
2. Set `VITE_SUBSCRIBE_URL` in `.env.local` to the printed
   `subscribe--<slug>.fns.muhkoo.dev` URL; the form in `index.html` un-hides.

To also forward to an external CRM/mailer (HubSpot, SendGrid, Mailgun, …), call it
with plain `fetch()` from the function (only platform calls must use `MUHKOO_API`)
and keep API keys as placeholders substituted at provision time — see the
[api-functions](api-functions.md) "secrets-in-source" note.

## Contract

- Stays **responsive** (no horizontal scroll, ~360px → desktop).
- The site works with `VITE_SUBSCRIBE_URL` unset (form hidden) — don't hard-depend
  on the function.
- No `@muhkoo/connect` / ZK assets — keep the bundle light (that's the point).
