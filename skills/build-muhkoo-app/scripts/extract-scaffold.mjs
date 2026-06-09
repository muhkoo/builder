#!/usr/bin/env node
/**
 * extract-scaffold.mjs — harvest a reusable scaffold from a finished build.
 *
 * A build session reworks the user's original plain-language prompt into a real app:
 * a provision spec (`app.json`) + actual feature code. This script captures that
 * rework so it feeds back into the plugin's library — two artifacts:
 *
 *   1. scaffolds/<name>.md          — a scaffold skeleton in the canonical shape
 *                                     (when-to-use → pattern → gotchas → contract),
 *                                     ready for you to fill the *applied* pattern in.
 *   2. scaffolds/seeds/<name>.spec.json — the **captured rework**: a genericized copy
 *                                     of the build's reworked spec (tables/channels/
 *                                     agents/functions shapes, with keys/ids/secrets
 *                                     stripped), reusable as a seed for the next build.
 *
 * Usage:
 *   node extract-scaffold.mjs --name <kebab> [--kind api|capability] \
 *     [--title "..."] [--from <appDir|app.json>] [--surface client.x]
 *
 * Then: fill in scaffolds/<name>.md from the real code you just wrote, and add a row
 * to scaffolds/README.md. The script never overwrites an existing scaffold.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const SKILL = resolve(here, "..");
const SCAFFOLDS = join(SKILL, "scaffolds");
const SEEDS = join(SCAFFOLDS, "seeds");

// --- args ------------------------------------------------------------------
const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith("--")) args[a.slice(2)] = process.argv[i + 1]?.startsWith("--") || i + 1 >= process.argv.length ? true : process.argv[++i];
}
const die = (m) => { console.error(`✗ ${m}`); process.exit(1); };

const name = typeof args.name === "string" ? args.name : null;
if (!name) die("Missing --name <kebab>. e.g. --name dark-mode");
if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) die(`--name must be kebab-case (got "${name}").`);
const kind = args.kind === "api" || args.kind === "capability" ? args.kind : "capability";
const title = typeof args.title === "string" ? args.title : name.replace(/-/g, " ");
const surface = typeof args.surface === "string" ? args.surface : null;

// --- capture the rework ----------------------------------------------------
/** Read the build's reworked spec from --from (a dir holding app.json, or a json path). */
function loadRework(from) {
  if (!from || from === true) return null;
  const path = existsSync(from) && from.endsWith(".json")
    ? from
    : [join(from, "app.json"), join(from, ".muhkoo-app.json")].find(existsSync);
  if (!path) die(`--from "${from}": no app.json / .muhkoo-app.json found.`);
  try { return { path, spec: JSON.parse(readFileSync(path, "utf8")) }; }
  catch (e) { die(`--from "${path}": ${e.message}`); }
}

/** Strip ids/keys/secrets/origins — keep the *shape* of the reworked design. */
function genericize(spec) {
  const keep = {};
  if (spec.slug) keep.slug = "<your-slug>";
  if (Array.isArray(spec.tables)) keep.tables = spec.tables;
  const chans = spec.channels || spec.spaces;
  if (Array.isArray(chans)) keep.channels = chans;
  if (Array.isArray(spec.agents)) {
    keep.agents = spec.agents.map((a) => ({
      handle: a.handle, model: a.model, enableChannel: a.enableChannel,
      systemPrompt: a.systemPrompt ? "<eject from src/agent/agentApp.ts>" : undefined,
      tools: a.tools,
    }));
  }
  if (Array.isArray(spec.functions)) {
    keep.functions = spec.functions.map((f) => ({ name: f.name, trigger: f.trigger, enableChannel: f.enableChannel }));
  }
  return keep;
}

const rework = loadRework(args.from);
const seed = rework ? genericize(rework.spec) : null;

// --- write the captured-rework seed ---------------------------------------
const seedPath = join(SEEDS, `${name}.spec.json`);
if (seed) {
  if (existsSync(seedPath)) die(`${seedPath} already exists — refusing to overwrite.`);
  mkdirSync(SEEDS, { recursive: true });
  writeFileSync(seedPath, JSON.stringify(seed, null, 2) + "\n");
}

// --- write the scaffold skeleton ------------------------------------------
const mdPath = join(SCAFFOLDS, `${name}.md`);
if (existsSync(mdPath)) die(`${mdPath} already exists — refusing to overwrite.`);

const heading = kind === "api" && surface ? `Scaffold: \`${surface}\` — ${title}` : `Scaffold: ${title}`;
const reworkBlock = seed
  ? `\n## Captured rework — the spec this came from\n\nThe genericized reworked spec is saved at [seeds/${name}.spec.json](./seeds/${name}.spec.json).\nSeed a future build's \`app.json\` from it (re-add origins/email; keys/ids are issued at\nprovision time).\n\n\`\`\`json\n${JSON.stringify(seed, null, 2)}\n\`\`\`\n`
  : "";

const md = `# ${heading}

**Use when** <one or two sentences: the exact situation an app needs this. Be specific
about when NOT to use it / what the simpler alternative is.>

## The pattern

<The *applied* code you actually wrote during the build — not signatures, the real
shape. Paste the working snippet (a hook, a handler, a wiring block) and trim it to the
essence. This is the payoff: someone follows this instead of re-deriving it.>

\`\`\`ts
// TODO: the real pattern from the build
\`\`\`
${reworkBlock}
## Gotchas

1. <the non-obvious thing that bit you / that you had to get right>
2. <ordering, gating (\`ready\`), scoping (\`owner\`/\`commitment\`), CORS, etc.>

## Contract — what must stay intact

- Every \`data-cy\` hook stays (the Cypress suite drives them).
- \`@muhkoo/connect\` calls/hooks untouched; composer stays gated on \`ready\`.
- Result stays **responsive** (~360px → desktop, no horizontal scroll).
- Re-run \`npm run test:e2e\` after applying — a scaffold must never break the suite.

## See it in
<the app/file this was distilled from — e.g. \`examples/<app>/src/...\`>
`;

writeFileSync(mdPath, md);

// --- report ----------------------------------------------------------------
console.log(`✓ Harvested scaffold "${name}" (${kind})`);
console.log(`  scaffold: ${mdPath}`);
if (seed) console.log(`  rework:   ${seedPath}  (captured from ${rework.path})`);
console.log(`\nNext:`);
console.log(`  1. Fill in ${name}.md from the real code you wrote (pattern + gotchas + see-it-in).`);
console.log(`  2. Add a row to scaffolds/README.md under "${kind === "api" ? "API scaffolds" : "Capability scaffolds"}".`);
if (!seed) console.log(`  (Tip: pass --from <appDir> to also capture the build's reworked spec as a seed.)`);
