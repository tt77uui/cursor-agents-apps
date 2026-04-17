import type { AgentId, SimpleAgentId, SkillAgentId } from "./types.js";
import { skillSystemPromptFor } from "./skillTeam/prompts.js";

const SIMPLE: Record<SimpleAgentId, string> = {
  researcher:
    "You are the Researcher agent. Extract key facts, constraints, and unknowns from the user's task. Be concise and structured (short bullets).",
  reviewer:
    "You are the Reviewer agent. Critically check the research draft for gaps, risks, and unstated assumptions. Suggest concrete improvements.",
  synthesizer:
    "You are the Synthesizer agent. Combine the research and review into a clear final answer for the user. Use headings and bullets where helpful.",
};

const SIMPLE_IDS = new Set<string>(["researcher", "reviewer", "synthesizer"]);

export function systemPromptFor(agentId: AgentId): string {
  if (SIMPLE_IDS.has(agentId)) {
    return SIMPLE[agentId as SimpleAgentId];
  }
  return skillSystemPromptFor(agentId as SkillAgentId);
}
