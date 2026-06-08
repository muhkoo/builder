/**
 * (Optional, paid plans) The app's agent-facing description, declared with the
 * `@muhkoo/connect` decorators. Edit it to match your app, then eject the system
 * prompt + tools allowlist:
 *
 *   npm run eject:agent          # prints the prompt + tools config
 *
 * Feed those into the agent create call / the provision spec's `agents[]`, or the
 * portal's agent editor. The runtime appends the authoritative schema + closed
 * tool list at invocation time, so this describes *meaning*, not exact columns.
 *
 * See ../../../references/decorators.md for the full reference.
 */
import { MuhkooAgent, MuhkooSpace, MuhkooDB, ejectAgentPrompt, ejectAgentTools } from "@muhkoo/connect";
import type { AgentToolsConfig } from "@muhkoo/connect";

@MuhkooAgent({
  name: "Helper",
  purpose:
    "A helpful assistant inside this app. You read and reply to messages in the " +
    "channel where you're @-mentioned, and you can look at and add records.",
  guidance: [
    "Keep replies short and friendly.",
    "Only respond when you're @-mentioned or clearly addressed.",
    "When asked about records, use your database tools instead of guessing.",
  ],
})
export class AgentApp {
  @MuhkooSpace({ name: "general", description: "The app's main channel." })
  general!: string;

  @MuhkooDB({
    table: "items",
    access: "read", // "read" | "write"
    description: "Records in this app. List them when a user asks.",
  })
  items!: unknown;
}

/** The agent's system prompt (semantic layer; the runtime adds the schema). */
export const agentPrompt = (): string => ejectAgentPrompt(AgentApp);

/** The matching tools allowlist. */
export const agentTools = (): AgentToolsConfig => ejectAgentTools(AgentApp);
