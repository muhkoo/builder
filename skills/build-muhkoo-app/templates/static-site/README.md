# Muhkoo static site

A statically-hosted website on [Muhkoo](https://muhkoo.dev) — no auth, no SDK,
no ZK. Just HTML/CSS/JS that builds to `dist/` and deploys to
`https://<slug>.apps.muhkoo.dev`. Optionally wires one serverless function for an
email list.

## Develop

```bash
npm install
npm run dev          # http://localhost:5173
```

Edit `index.html`, `src/style.css`, `src/main.js`. Add pages as extra Vite inputs
(see `vite.config.js`).

## Deploy

```bash
MUHKOO_DEPLOY_KEY=mk_live_sk_…  MUHKOO_APP_ID=<appId>  npm run deploy
```

Builds, uploads only changed files (content-addressed), commits a release, and
prints the live URL. The deploy key is the app **secret** key — server-side only,
never in the bundle. For CI, set the repo secrets in `.github/workflows/deploy.yml`.

## Email list (optional)

`functions/subscribe.js` is a Muhkoo serverless function (paid tier) that stores
signups in a `subscribers` database table. To use it:

1. Provision a `subscribers` table and the `subscribe` function (provision spec
   `tables[]` + `functions[]`, or the portal).
2. Put the function's URL in `.env.local` as `VITE_SUBSCRIBE_URL` — the signup
   form in `index.html` un-hides and posts to it.

Leave `VITE_SUBSCRIBE_URL` unset and the form stays hidden; the site works fine
without it.
