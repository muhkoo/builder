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
  name: "Task Helper",
  purpose:
    "A helpful assistant inside Task Board — a shared team task list. You read and " +
    "reply to messages in the channel where you're @-mentioned, and you can look at " +
    "and add tasks.",
  guidance: [
    "Keep replies short and friendly.",
    "Only respond when you're @-mentioned or clearly addressed.",
    "When asked what's on the list or to add a task, use your database tools instead of guessing.",
  ],
})
export class AgentApp {
  @MuhkooSpace({ name: "general", description: "The team-wide task channel." })
  general!: string;

  @MuhkooDB({
    table: "tasks",
    access: "write", // can list and add tasks
    description: "Team tasks: a `title` and a `done` flag. List, add, or tick off when asked.",
  })
  tasks!: unknown;
}

/** The agent's system prompt (semantic layer; the runtime adds the schema). */
export const agentPrompt = (): string => ejectAgentPrompt(AgentApp);

/** The matching tools allowlist. */
export const agentTools = (): AgentToolsConfig => ejectAgentTools(AgentApp);
