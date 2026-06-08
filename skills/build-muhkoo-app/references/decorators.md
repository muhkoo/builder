# Describing an app for an agent: the `@Muhkoo*` decorators

When an app has an AI agent, you teach the agent what the app is and how to use it by
**describing the app's surface in code** with TypeScript decorators, then **ejecting** a
system prompt + a tools allowlist. This keeps the agent's knowledge in sync with the app
and avoids hand-writing brittle prompts.

The decorators live in `@muhkoo/connect`. The eject functions turn a decorated class into
exactly the two things `client.agents.create()` / the `POST …/agents` route want:
`systemPrompt` and `tools`.

## The pattern (mirrors the worked reference in `muhkoo/web`)

```ts
import {
  MuhkooAgent, MuhkooSpace, MuhkooDB, MuhkooFunction,
  ejectAgentPrompt, ejectAgentTools,
} from "@muhkoo/connect";
import type { AgentToolsConfig } from "@muhkoo/connect";

@MuhkooAgent({
  name: "Standup Helper",
  purpose:
    "A helpful assistant inside a team standup app. You read and reply to messages " +
    "in the channel where you're @-mentioned, and you can look at and add tasks.",
  guidance: [
    "Keep replies short and friendly.",
    "Only respond when you're @-mentioned or clearly addressed.",
    "When asked about tasks, use your database tools instead of guessing.",
  ],
})
export class StandupAgentApp {
  @MuhkooSpace({ name: "general", description: "The team-wide standup channel." })
  general!: string;

  @MuhkooDB({
    table: "tasks",
    access: "write", // "read" | "write" — gates the db tools the agent gets
    description: "Team tasks: title, done, owner. List/add/update when asked.",
  })
  tasks!: unknown;

  // @MuhkooFunction({ name: "notify", description: "Send a standup summary." }) notify!: unknown;
}

export const standupAgentPrompt = () => ejectAgentPrompt(StandupAgentApp);
export const standupAgentTools  = (): AgentToolsConfig => ejectAgentTools(StandupAgentApp);
```

## Decorator reference

- `@MuhkooAgent({ name, purpose, guidance?, instructions? })` — **class** decorator. App
  identity + behavior.
- `@MuhkooSpace({ name?, description })` — a channel the agent participates in (`name`
  defaults to the property key).
- `@MuhkooDB({ table?, access?, description })` — a table the agent may use. `access:
  "read"` → read-only db tools; `"write"` → read + write tools (`table` defaults to the
  property key).
- `@MuhkooFunction({ name?, description })` — a callable serverless function.

## What eject produces

- `ejectAgentPrompt(Cls)` → the **semantic** system prompt: what the app is, how to
  behave, what each surface means. It deliberately does **not** restate exact columns or
  the closed tool list — the Muhkoo runtime appends the authoritative schema + the
  "these are your only tools" roster at invocation time, so the prompt can't drift.
- `ejectAgentTools(Cls)` → an `AgentToolsConfig` allowlist: `{ enabled, db: { mode,
  tables }, functions, channels, maxIterations }`. Hand it straight to the agent create
  call. `tools.enabled` requires a function-calling model.

## Ejecting from the command line

Decorators need `experimentalDecorators`. Run the bundled helper with `tsx`:

```bash
node skills/build-muhkoo-app/scripts/eject-agent.mjs path/to/agentApp.ts
# prints:  ===== system prompt =====  …   ===== tools config =====  { … }
```

Paste the prompt + tools into the agent create call (or the portal's agent editor). The
model must be one of the function-calling models from `GET /api/apps/agent-models`
(`fnCallingModels`) for tool-use to take effect.

## Function-calling models (as of writing)

`meta/llama-3.3-70b-instruct-fp8-fast`, `meta/llama-4-scout-17b-16e-instruct`,
`openai/gpt-oss-120b`, `openai/gpt-oss-20b`, `mistralai/mistral-small-3.1-24b-instruct`.
The default 8b model **cannot** function-call. Always read the live catalog
(`GET /api/apps/agent-models`, field `fnCallingModels`) rather than hard-coding.

**Pick for latency + tool quality, not size.** The platform's `defaultToolModel`
is `llama-3.3-70b-fp8-fast`, which is **slow** for an interactive chat agent —
measured ~100s to reply on a simple "list tasks" mention, and prone to *narrating its
tools* ("you can call db_query…") or refusing instead of acting. **`openai/gpt-oss-120b`
is the better default** — noticeably faster and more reliable at actually invoking
tools (the gpt-oss parsing path is the validated one on this accelerator). `gpt-oss-20b`
is faster still but weaker at tool-use. Keep `maxIterations` low (2–3) for simple agents;
each round is a full inference call, so 6 rounds multiplies latency.

If an agent answers slowly or dumps its tool list as prose, that's the model/loop — switch
to `gpt-oss-120b`, lower `maxIterations`, and add a line to the prompt: "Act, don't
explain — use your tools immediately and reply in one short sentence; never list or
describe your tools."
