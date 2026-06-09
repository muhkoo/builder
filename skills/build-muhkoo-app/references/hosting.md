# Hosting reference — deploy a built SPA to Muhkoo

Muhkoo hosts the app's frontend at **`https://<slug>.apps.muhkoo.dev`** (the
`<slug>` is the app's slug — globally unique). Deploys are content-addressed and
instant: upload changed files (by sha256), then commit a release (an atomic pointer
flip; rollback is the same flip). Hosted bytes count against the developer's
**storage quota** — a deploy that would exceed it is rejected.

## Deploy auth — the app SECRET key

Deploys are authorized by the app's **secret key** (`mk_live_sk_*` / `mk_test_sk_*`)
as a bearer token, or a developer session. The secret key is server-side only —
**never** ship it in the browser bundle (that's the publishable `pk`). In CI it's a
repository secret (`MUHKOO_DEPLOY_KEY`). Rotate/revoke it in the portal like any key.

## The easy path — `deploy.mjs`

The starter template ships `scripts/deploy.mjs`. From the app dir:

```bash
npm run build
MUHKOO_DEPLOY_KEY=mk_live_sk_…  MUHKOO_APP_ID=<appId>  node scripts/deploy.mjs
# or just: npm run deploy   (build + deploy)
# --base prod|staging|local  (default prod)
```

It walks `dist/`, sha256s each file, `PUT`s only the changed blobs (dedup), commits
the release, and prints the live URL.

## GitHub CI/CD

`.github/workflows/deploy.yml` builds + deploys on push to `main`. Repository secrets:

| Secret | What |
| --- | --- |
| `MUHKOO_DEPLOY_KEY` | app **secret** key (`mk_live_sk_…`) — authorizes the deploy |
| `MUHKOO_APP_ID` | the app id (from `.muhkoo-app.json` or the portal) |
| `VITE_MUHKOO_KEY` | app **publishable** key (`mk_live_pk_…`) — baked into the bundle at build |

(For CI, depend on the published `@muhkoo/connect` from npm rather than a local
`file:` path.)

## The deploy API (if you're not using the CLI)

All under `/api/apps/:appId/hosting`, `Authorization: Bearer <app sk | dev session>`:

| Method | Path | Body | Purpose |
| --- | --- | --- | --- |
| PUT | `/hosting/blob/:sha` | raw file bytes | Upload one file; server verifies `sha256(body)===sha` + dedups. |
| POST | `/hosting/releases` | `{ manifest: { "<path>": "<sha>", … } }` | Commit a release (validates blobs exist, enforces storage quota, flips live). Returns `{ releaseId, url, bytes, files }`. |
| GET | `/hosting` | — | Site status: url, current release, bytes, release history. |
| POST | `/hosting/rollback` | `{ releaseId }` | Re-point the site to a prior release. |
| DELETE | `/hosting` | — | Unpublish the site. |

The manifest maps each file's path (relative to `dist/`, forward slashes,
`index.html` at root) to its blob sha. `index.html` is required; unknown deep-link
paths fall back to it (SPA routing). Asset files are cached immutably; `index.html`
revalidates, so a deploy is live immediately.

## Notes

- One site per app (subdomain = slug). The slug is reserved to the app, so two apps
  can never collide on a host.
- CORS: the hosted SPA calls `api.muhkoo.dev` with its publishable key from
  `<slug>.apps.muhkoo.dev`; the app's default `allowedOrigins: "*"` permits it. If you
  tighten CORS, add the hosting origin.
- The first deploy to a new `*.apps.muhkoo.dev` host needs the wildcard TLS cert
  active (platform infra) — until then the host may briefly fail TLS.
