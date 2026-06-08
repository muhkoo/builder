#!/usr/bin/env node
/**
 * eject-agent.mjs — print the system prompt + tools allowlist for a `@Muhkoo*`-
 * decorated agent description class.
 *
 *   node eject-agent.mjs <path/to/agentApp.ts> [ExportName]
 *
 * Paste the printed prompt + tools into the agent create call (or the spec file's
 * `agents[].systemPrompt` / `agents[].tools`), or into the portal's agent editor.
 *
 * Mechanics: spawns `tsx` (via npx) on the bundled `_eject-runner.ts`, with the
 * working directory set to the target file's directory so that `@muhkoo/connect`
 * and the project's tsconfig (`experimentalDecorators`) resolve. Run this against a
 * file inside the scaffolded app (after `npm i`) — that's where the SDK is installed.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve, basename, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const target = process.argv[2];
const exportName = process.argv[3];

if (!target) {
  console.error("usage: node eject-agent.mjs <path/to/agentApp.ts> [ExportName]");
  process.exit(1);
}

const runner = resolve(here, "_eject-runner.ts");
const targetAbs = resolve(target);
const cwd = dirname(targetAbs);

/**
 * Find the project root (nearest ancestor with package.json) so cwd has
 * @muhkoo/connect resolvable, and use its decorators tsconfig (experimental
 * decorators + ESM module output) for tsx's esbuild transform.
 */
let projectRoot = cwd;
while (projectRoot !== dirname(projectRoot) && !existsSync(join(projectRoot, "package.json"))) {
  projectRoot = dirname(projectRoot);
}
const tsconfig = ["tsconfig.app.json", "tsconfig.json"]
  .map((f) => join(projectRoot, f))
  .find((p) => existsSync(p));

const tsxArgs = ["--yes", "tsx"];
if (tsconfig) tsxArgs.push("--tsconfig", tsconfig);
tsxArgs.push(runner, targetAbs, ...(exportName ? [exportName] : []));

const child = spawn("npx", tsxArgs, { cwd: projectRoot, stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 0));
child.on("error", (err) => {
  console.error(
    `Failed to run tsx: ${err.message}\n` +
    `Ensure Node 20+ is installed and run this against a file in the scaffolded app ` +
    `(where @muhkoo/connect is a dependency).`,
  );
  process.exit(1);
});
