/**
 * Prints the agent's system prompt + tools allowlist. Run via:
 *
 *   npm run eject:agent
 *
 * Paste the output into your provision spec's `agents[]` entry (systemPrompt +
 * tools) or the portal's agent editor. The agent's `model` must be a
 * function-calling model for tools to take effect.
 */
import { agentPrompt, agentTools } from "./agentApp";

console.log("\n===================== system prompt =====================\n");
console.log(agentPrompt());
console.log("\n====================== tools config =====================\n");
console.log(JSON.stringify(agentTools(), null, 2));
console.log("");
