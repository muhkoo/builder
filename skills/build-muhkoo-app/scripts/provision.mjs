#!/usr/bin/env node
/**
 * provision.mjs — create a Muhkoo app's backend from a design spec.
 *
 * Dependency-light (Node 20+, global fetch). Drives the developer-authenticated
 * management API with an `Authorization: Bearer <devToken>` header. See
 * ../references/provisioning.md for the full contract.
 *
 *   node provision.mjs --spec app.json [options]
 *   node provision.mjs --spec app.json --enable   # enable agents/functions on channels
 *
 * Auth (first that resolves wins):
 *   --token <t> | $MUHKOO_DEV_TOKEN
 *   --username <u> --password <p> | $MUHKOO_USERNAME / $MUHKOO_PASSWORD
 *       → programmatic ZK login via @muhkoo/connect (best-effort; needs the SDK +
 *         snarkjs resolvable from cwd; falls back to a clear error if unavailable).
 *
 * Spec file (JSON):
 *   {
 *     "slug": "team-standup",
 *     "allowedOrigins": "*",
 *     "email": "you@example.com",        // only needed to bootstrap a new developer
 *     "tables": [ <DbTableSpec>, ... ],
 *     "agents": [ { ...AgentCreateInput, "enableChannel": "general" }, ... ],
 *     "functions": [ { ...FunctionDeployInput, "enableChannel": "general"? }, ... ]
 *   }
 *
 * Output: writes the app id + issued keys + provisioned tables to an output file
 * (default ./.muhkoo-app.json) so re-runs are idempotent and the scaffold step can
 * read the publishable key back.
 */

const BASES = {
  prod: "https://api.muhkoo.dev",
  production: "https://api.muhkoo.dev",
  staging: "https://api.staging.muhkoo.dev",
  local: "http://localhost:8787",
};

function parseArgs(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t.startsWith("--")) {
      const key = t.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) a[key] = true;
      else { a[key] = next; i++; }
    } else a._.push(t);
  }
  return a;
}

const args = parseArgs(process.argv.slice(2));
const DRY = !!args["dry-run"];
const ENABLE_MODE = !!args.enable;
const OUT = args.out || ".muhkoo-app.json";
const baseUrl = (args.base && (BASES[args.base] || args.base)) || BASES.prod;

function die(msg) { console.error(`\n✗ ${msg}\n`); process.exit(1); }
function info(msg) { console.log(msg); }

async function readJson(path) {
  const { readFile } = await import("node:fs/promises");
  return JSON.parse(await readFile(path, "utf8"));
}
async function writeJson(path, obj) {
  const { writeFile } = await import("node:fs/promises");
  await writeFile(path, JSON.stringify(obj, null, 2) + "\n");
}
async function fileExists(path) {
  const { access } = await import("node:fs/promises");
  try { await access(path); return true; } catch { return false; }
}

/** Authenticated request to the management API. Returns { ok, status, body }. */
async function call(token, method, path, body) {
  const headers = { Authorization: `Bearer ${token}` };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(baseUrl + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let parsed = null;
  const text = await res.text();
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
  return { ok: res.ok, status: res.status, body: parsed };
}

/** App-key request (channel resolution lives on the app-key data plane). */
async function appKeyGet(appKey, path) {
  const res = await fetch(baseUrl + path, { headers: { "X-Muhkoo-Key": appKey } });
  if (!res.ok) return null;
  return res.json().catch(() => null);
}

/**
 * Download the ZK login circuit assets (wasm + zkey) from the API to a temp dir
 * and return their local paths. In Node, snarkjs reads these off disk, so the
 * default HTTP URLs don't work — we materialize local copies.
 */
async function downloadCircuits(base) {
  const { mkdtemp, writeFile } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const dir = await mkdtemp(join(tmpdir(), "muhkoo-circuits-"));
  const fetchTo = async (path, file) => {
    const res = await fetch(base + path);
    if (!res.ok) die(`Could not fetch circuit asset ${path} (${res.status}).`);
    const out = join(dir, file);
    await writeFile(out, Buffer.from(await res.arrayBuffer()));
    return out;
  };
  const [wasmUrl, zkeyUrl] = await Promise.all([
    fetchTo("/circuits/build/preimagePoK_js/preimagePoK.wasm", "preimagePoK.wasm"),
    fetchTo("/circuits/build/preimagePoK_0001.zkey", "preimagePoK_0001.zkey"),
  ]);
  return { wasmUrl, zkeyUrl };
}

async function resolveToken() {
  const token = args.token || process.env.MUHKOO_DEV_TOKEN;
  if (typeof token === "string" && token.length > 0) return token;

  const username = args.username || process.env.MUHKOO_USERNAME;
  const password = args.password || process.env.MUHKOO_PASSWORD;
  if (username && password) {
    info("→ Logging in via @muhkoo/connect (programmatic ZK auth)…");
    let Client;
    try {
      // Resolve the SDK from the working directory (where the app installed it),
      // not from this script's own location.
      const { createRequire } = await import("node:module");
      const { pathToFileURL } = await import("node:url");
      const { join } = await import("node:path");
      const req = createRequire(join(process.cwd(), "package.json"));
      const connectUrl = pathToFileURL(req.resolve("@muhkoo/connect")).href;
      ({ Client } = await import(connectUrl));
    } catch (e) {
      die(
        "Could not import @muhkoo/connect for programmatic login.\n" +
        "  Either run this from a directory where @muhkoo/connect is installed\n" +
        "  (e.g. the scaffolded app after `npm install`), or pass a session token\n" +
        "  with --token (copy it from the portal after signing in).\n" +
        `  Underlying error: ${e?.message || e}`,
      );
    }
    // ZK login needs the circuit assets as LOCAL files in Node (snarkjs reads
    // them off disk, not over HTTP). Download them from the API once and point
    // the Client at the local copies.
    const circuits = await downloadCircuits(baseUrl);
    const client = new Client({ baseUrl, circuits });
    await client.auth.zk.login(username, password);
    const t = client.auth.zk.token;
    if (!t) die("Login succeeded but no session token was issued.");
    return t;
  }

  die(
    "No developer credentials. Provide one of:\n" +
    "  --token <sessionToken>            (copy from the portal after login)\n" +
    "  --username <u> --password <p>     (programmatic ZK login)\n" +
    "or set MUHKOO_DEV_TOKEN / MUHKOO_USERNAME+MUHKOO_PASSWORD.",
  );
}

async function ensureDeveloper(token, email) {
  const me = await call(token, "GET", "/api/developer/me");
  if (me.ok) return;
  if (me.status === 404 || me.status === 402) {
    if (!email) {
      die("This developer account isn't set up yet. Add an \"email\" to the spec " +
          "(billing contact) so the account can be bootstrapped.");
    }
    info(`→ Bootstrapping developer account (${email})…`);
    if (DRY) return;
    const r = await call(token, "POST", "/api/developer/bootstrap", { email });
    if (!r.ok) die(`Developer bootstrap failed (${r.status}): ${JSON.stringify(r.body)}`);
  }
}

async function createOrReuseApp(token, spec, prior) {
  if (prior?.appId) {
    info(`→ Reusing existing app ${prior.slug} (${prior.appId}).`);
    return prior;
  }
  info(`→ Creating app "${spec.slug}"…`);
  if (DRY) return { appId: "<dry-run>", slug: spec.slug, keys: [] };
  const body = { slug: spec.slug, allowedOrigins: spec.allowedOrigins || "*" };
  if (spec.email) body.email = spec.email;
  let r = await call(token, "POST", "/api/apps", body);
  // Bootstrap-on-create: the API may ask for a billing email on the first app.
  if (!r.ok && r.status === 402 && spec.email) {
    await ensureDeveloper(token, spec.email);
    r = await call(token, "POST", "/api/apps", body);
  }
  if (!r.ok) die(`Create app failed (${r.status}): ${JSON.stringify(r.body)}`);
  const keys = r.body.keys || [];
  const pk = keys.find((k) => k.env === "test" && k.type === "pk")?.plaintext;
  info(`  ✓ appId ${r.body.appId}` + (pk ? `   test pk ${pk.slice(0, 18)}…` : ""));
  return { appId: r.body.appId, slug: r.body.slug, keys };
}

async function putTables(token, appId, tables) {
  const done = [];
  for (const spec of tables || []) {
    info(`→ Table "${spec.table}" (${(spec.columns || []).length} cols)…`);
    if (DRY) { done.push(spec.table); continue; }
    const r = await call(token, "PUT", `/api/apps/${appId}/db/tables/${encodeURIComponent(spec.table)}`, spec);
    if (!r.ok) die(`Table "${spec.table}" failed (${r.status}): ${JSON.stringify(r.body)}`);
    info(`  ✓ ${spec.table} v${r.body.version}`);
    done.push(spec.table);
  }
  return done;
}

async function createAgents(token, appId, agents) {
  const created = [];
  if (!(agents || []).length) return created;
  // Idempotent: match an existing agent by handle and PATCH (update) instead of
  // re-creating, so re-running provision updates rather than failing.
  const list = await call(token, "GET", `/api/apps/${appId}/agents`);
  const existing = list.ok ? list.body?.agents || [] : [];
  for (const a of agents || []) {
    const { enableChannel, ...input } = a;
    info(`→ Agent ${input.handle}…`);
    if (DRY) { created.push({ handle: input.handle, enableChannel }); continue; }
    const match = existing.find((e) => e.handle === input.handle);
    const r = match
      ? await call(token, "PATCH", `/api/apps/${appId}/agents/${match.agentId}`, input)
      : await call(token, "POST", `/api/apps/${appId}/agents`, input);
    if (r.status === 402) {
      info(`  ⚠ Agents need a paid plan — skipped ${input.handle}. (Config saved for later.)`);
      created.push({ handle: input.handle, enableChannel, skipped: "paid-tier", input });
      continue;
    }
    if (!r.ok) die(`Agent ${input.handle} failed (${r.status}): ${JSON.stringify(r.body)}`);
    const agentId = r.body.config.agentId;
    info(`  ✓ ${input.handle} (${agentId})${match ? " [updated]" : ""}`);
    created.push({ handle: input.handle, agentId, enableChannel });
  }
  return created;
}

async function deployFunctions(token, appId, fns) {
  const deployed = [];
  if (!(fns || []).length) return deployed;
  // Idempotent: match an existing function by name and PATCH (redeploy the code)
  // instead of POST — re-running provision updates rather than 409-ing.
  const list = await call(token, "GET", `/api/apps/${appId}/functions`);
  const existing = list.ok ? list.body?.functions || [] : [];
  for (const f of fns || []) {
    const { enableChannel, ...input } = f;
    info(`→ Function ${input.name}…`);
    if (DRY) { deployed.push({ name: input.name, enableChannel }); continue; }
    const match = existing.find((e) => e.name === input.name);
    const r = match
      ? await call(token, "PATCH", `/api/apps/${appId}/functions/${match.functionId}`, input)
      : await call(token, "POST", `/api/apps/${appId}/functions`, input);
    if (r.status === 402) {
      info(`  ⚠ Functions need a paid plan — skipped ${input.name}. (Config saved for later.)`);
      deployed.push({ name: input.name, enableChannel, skipped: "paid-tier", input });
      continue;
    }
    if (!r.ok) die(`Function ${input.name} failed (${r.status}): ${JSON.stringify(r.body)}`);
    const functionId = r.body.config.functionId;
    info(`  ✓ ${input.name} (${functionId})${match ? " [redeployed]" : ""}`);
    deployed.push({ name: input.name, functionId, enableChannel });
  }
  return deployed;
}

/** Resolve channel names → spaceIds (app-key route) and enable agents/functions. */
async function enableOnChannels(token, record) {
  const appKey = record.keys?.find((k) => k.env === "test" && k.type === "pk")?.plaintext;
  if (!appKey) die("No test publishable key on record — cannot resolve channels.");
  const resolve = async (name) => {
    const r = await appKeyGet(appKey, `/api/app/channels/${encodeURIComponent(name)}`);
    return r?.spaceId || null;
  };
  for (const a of record.agents || []) {
    if (!a.agentId || !a.enableChannel) continue;
    const spaceId = await resolve(a.enableChannel);
    if (!spaceId) { info(`  ⚠ channel "${a.enableChannel}" not found yet — run the app once, then re-run with --enable.`); continue; }
    const r = await call(token, "POST", `/api/apps/${record.appId}/agents/${a.agentId}/enable`, { targetSpaceId: spaceId });
    info(r.ok ? `  ✓ enabled ${a.handle} on #${a.enableChannel}` : `  ✗ enable ${a.handle}: ${r.status}`);
  }
  for (const f of record.functions || []) {
    if (!f.functionId || !f.enableChannel) continue;
    const spaceId = await resolve(f.enableChannel);
    if (!spaceId) { info(`  ⚠ channel "${f.enableChannel}" not found yet — run the app once, then re-run with --enable.`); continue; }
    const r = await call(token, "POST", `/api/apps/${record.appId}/functions/${f.functionId}/enable`, { targetSpaceId: spaceId });
    info(r.ok ? `  ✓ enabled fn ${f.name} on #${f.enableChannel}` : `  ✗ enable ${f.name}: ${r.status}`);
  }
}

async function main() {
  if (!args.spec) die("Missing --spec <file.json>. See ../references/provisioning.md.");
  const spec = await readJson(args.spec);
  const prior = (await fileExists(OUT)) ? await readJson(OUT) : null;
  const token = await resolveToken();
  info(`API base: ${baseUrl}${DRY ? "   (dry run)" : ""}\n`);

  if (ENABLE_MODE) {
    if (!prior?.appId) die(`--enable needs a prior ${OUT} from a provisioning run.`);
    info("→ Enabling agents/functions on their channels…");
    await enableOnChannels(token, prior);
    info("\n✓ Done.");
    return;
  }

  await ensureDeveloper(token, spec.email);
  const app = await createOrReuseApp(token, spec, prior);
  const tables = await putTables(token, app.appId, spec.tables);
  const agents = await createAgents(token, app.appId, spec.agents);
  const functions = await deployFunctions(token, app.appId, spec.functions);

  // Every app gets a hosting subdomain (served once you deploy its built client).
  const appsSuffix = baseUrl.includes("staging") ? "apps.staging.muhkoo.dev" : "apps.muhkoo.dev";
  const hostingUrl = `https://${app.slug}.${appsSuffix}`;

  const record = {
    appId: app.appId,
    slug: app.slug,
    baseUrl,
    hostingUrl,
    keys: app.keys?.length ? app.keys : prior?.keys || [],
    tables,
    agents,
    functions,
  };
  if (!DRY) await writeJson(OUT, record);

  const pk = record.keys.find((k) => k.env === "test" && k.type === "pk")?.plaintext;
  info("\n✓ Provisioned.");
  info(`  appId:   ${record.appId}`);
  info(`  slug:    ${record.slug}`);
  if (pk) info(`  test pk: ${pk}`);
  info(`  tables:  ${tables.join(", ") || "(none)"}`);
  info(`  hosting: ${hostingUrl}  (deploy your built client with \`npm run deploy\` to go live)`);
  if ((agents || []).some((a) => a.enableChannel) || (functions || []).some((f) => f.enableChannel)) {
    info("\nNext: run the app once so its channels exist, then enable agents/functions:");
    info(`  node ${process.argv[1].split("/").pop()} --spec ${args.spec} --base ${args.base || "prod"} --token <t> --enable`);
  }
  if (!pk) info("\n(No new keys issued — reusing the existing app. Keys live in " + OUT + " from the first run.)");
}

main()
  // Explicit exit: a programmatic ZK login leaves snarkjs worker threads
  // alive, so the process otherwise never terminates (looks like a hang).
  .then(() => process.exit(0))
  .catch((e) => die(e?.stack || e?.message || String(e)));
