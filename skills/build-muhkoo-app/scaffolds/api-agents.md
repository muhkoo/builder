# Scaffold: `client.agents` — a programmable agent (paid)

**Use when** the app wants an AI "virtual user" that reads/replies in a channel and can
act on the app (query/insert DB rows, post messages, call functions). Source: **web**
`src/agent/chatAgentApp.ts` (the `@Muhkoo*`-decorated description). Deep reference:
[decorators.md](../references/decorators.md).

## The pattern — describe in code, eject, provision

You don't hand-write the agent's prompt. Decorate a class with the app's agent-facing
surface, then **eject** the system prompt + tools allowlist and hand them to the agent.

```ts
// src/agent/agentApp.ts
import { MuhkooAgent, MuhkooSpace, MuhkooDB, ejectAgentPrompt, ejectAgentTools } from "@muhkoo/connect";

@MuhkooAgent({
  name: "Helper",
  purpose: "A helpful assistant inside this app. Reply when @-mentioned; look at and add records.",
  guidance: [
    "Keep replies short and friendly.",
    "Only respond when @-mentioned or clearly addressed.",
    "Use your database tools instead of guessing.",
  ],
})
export class AgentApp {
  @MuhkooSpace({ name: "general", description: "The app's main channel." })
  general!: string;
  @MuhkooDB({ table: "tasks", access: "write", description: "Team tasks: title + done. List/add/tick off when asked." })
  tasks!: unknown;
}
export const agentPrompt = () => ejectAgentPrompt(AgentApp);
export const agentTools  = () => ejectAgentTools(AgentApp);
```

Eject (`muhkoo eject src/agent/agentApp.ts`) and put the result in the
provision spec's `agents[]` (`systemPrompt`, `tools`, a **function-calling** `model`,
`triggers: [{ type: "mention" }]`, `enableChannel`). Then `muhkoo provision` creates +
enables it. The same thing via the SDK: `client.agents.create(appId, { handle, displayName,
systemPrompt, model, tools })` then `client.agents.enable(appId, agentId, spaceId)`.

## Gotchas

1. **The ejected prompt is the *semantic* layer only.** The runtime appends the authoritative
   schema + the closed tool list at invocation time — never restate columns/tools in the
   prompt (it can't drift). Since `0.6.0-alpha.1` the ejected prompt also includes a "How to
   respond" section so the agent always posts a final reply after tool use (don't strip it, or
   on `gpt-oss-*` models the agent runs tools then goes silent).
2. **Pick a fast function-calling model.** The platform default tool model
   (`llama-3.3-70b-fp8-fast`) is slow (~100s) and narrates its tools; **`openai/gpt-oss-120b`**
   is much faster + better. `tools.enabled` requires a function-calling model. Keep
   `maxIterations` low (2–3).
3. **Paid-tier only** — agent create/enable returns `402` on a free account.
4. **Enable AFTER the channel exists.** Enable resolves the channel's spaceId; create the
   channel (run the app once) first, then enable.

## See it in
`web/src/agent/chatAgentApp.ts` + `web/scripts/eject-agent-prompt.ts`;
`task-board/src/agent/agentApp.ts` (the `@helper` worked example).
