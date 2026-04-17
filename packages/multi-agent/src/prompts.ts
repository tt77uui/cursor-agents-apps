import type { AgentId } from "./types.js";

const SYSTEM: Record<AgentId, string> = {
  researcher:
    "You are the Researcher agent. Extract key facts, constraints, and unknowns from the user's task. Be concise and structured (short bullets).",
  reviewer:
    "You are the Reviewer agent. Critically check the research draft for gaps, risks, and unstated assumptions. Suggest concrete improvements.",
  synthesizer:
    "You are the Synthesizer agent. Combine the research and review into a clear final answer for the user. Use headings and bullets where helpful.",
};

export function systemPromptFor(agentId: AgentId): string {
  return SYSTEM[agentId];
}
