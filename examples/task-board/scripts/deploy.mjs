#!/usr/bin/env node
/**
 * deploy.mjs — deploy this app's built `dist/` to Muhkoo hosting.
 *
 * Serves the SPA at https://<slug>.apps.muhkoo.dev. Content-addressed: each file
 * is uploaded by its sha256 (dedup — only changed files upload), then a release
 * is committed (an atomic pointer flip; instant + rollback-able).
 *
 *   MUHKOO_DEPLOY_KEY=mk_live_sk_…  MUHKOO_APP_ID=<appId>  node scripts/deploy.mjs
 *
 * Options / env:
 *   --app <appId>     | MUHKOO_APP_ID       the app to deploy to (required)
 *   --key <mk_*_sk_*> | MUHKOO_DEPLOY_KEY    the app SECRET key (required; never a pk)
 *   --base <url|env>  | MUHKOO_API_BASE      api base or prod|staging|local (default prod)
 *   --dist <dir>                              built output dir (default ./dist)
 *
 * Dependency-light (Node 20+, global fetch). Run `npm run build` first (the
 * GitHub Action and the `deploy:hosting` npm script do).
 */

import { readFile, readdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, relative, sep } from "node:path";

const BASES = {
  prod: "https://api.muhkoo.dev",
  production: "https://api.muhkoo.dev",
  staging: "https://api.staging.muhkoo.dev",
  local: "http://localhost:8787",
};

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
function die(msg) { console.error(`\n✗ ${msg}\n`); process.exit(1); }

const appId = arg("app", process.env.MUHKOO_APP_ID);
const key = arg("key", process.env.MUHKOO_DEPLOY_KEY);
const baseArg = arg("base", process.env.MUHKOO_API_BASE || "prod");
const base = BASES[baseArg] || baseArg;
const dist = arg("dist", "dist");

if (!appId) die("Missing app id. Pass --app <appId> or set MUHKOO_APP_ID.");
if (!key) die("Missing deploy key. Pass --key <mk_*_sk_*> or set MUHKOO_DEPLOY_KEY.");
if (!/_sk_/.test(key)) die("MUHKOO_DEPLOY_KEY must be an app SECRET key (mk_live_sk_… / mk_test_sk_…), not a publishable key.");

const headers = { Authorization: `Bearer ${key}` };

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

async function main() {
  let files;
  try {
    if (!(await stat(dist)).isDirectory()) throw new Error();
    files = await walk(dist);
  } catch {
    die(`No build output at "${dist}". Run \`npm run build\` first (or pass --dist).`);
  }
  if (files.length === 0) die(`"${dist}" is empty.`);

  console.log(`→ Deploying ${files.length} files from ${dist}/ to ${base}\n`);

  // Build the manifest (path → sha256) and upload each unique blob.
  const manifest = {};
  const blobs = new Map(); // sha → bytes
  for (const file of files) {
    const bytes = await readFile(file);
    const sha = createHash("sha256").update(bytes).digest("hex");
    const path = relative(dist, file).split(sep).join("/");
    manifest[path] = sha;
    if (!blobs.has(sha)) blobs.set(sha, bytes);
  }

  let uploaded = 0, deduped = 0;
  for (const [sha, bytes] of blobs) {
    const res = await fetch(`${base}/api/apps/${appId}/hosting/blob/${sha}`, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/octet-stream" },
      body: bytes,
    });
    if (!res.ok) die(`Upload failed for ${sha} (${res.status}): ${await res.text()}`);
    const body = await res.json().catch(() => ({}));
    if (body.dedup) deduped++; else uploaded++;
  }
  console.log(`  ✓ ${uploaded} uploaded, ${deduped} unchanged (${blobs.size} unique files)`);

  // Commit the release (atomic flip).
  console.log("→ Committing release…");
  const res = await fetch(`${base}/api/apps/${appId}/hosting/releases`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ manifest }),
  });
  if (!res.ok) die(`Release failed (${res.status}): ${await res.text()}`);
  const out = await res.json();

  console.log(`\n✓ Deployed.`);
  console.log(`  release: ${out.releaseId}`);
  console.log(`  size:    ${(out.bytes / 1024).toFixed(0)} KiB across ${out.files} files`);
  console.log(`  live at: ${out.url}\n`);
}

main().catch((e) => die(e?.stack || e?.message || String(e)));
