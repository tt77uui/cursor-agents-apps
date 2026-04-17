import type { SkillAgentId } from "../types.js";

export const SKILL_TEAM_PIPELINE: readonly SkillAgentId[] = [
  "discovery-analyst",
  "systems-architect",
  "prompt-architect",
  "engineer",
  "qa-guardian",
  "risk-compliance",
  "delivery-editor",
  "reviewer-board",
  "orchestrator",
] as const;

export const SKILL_AGENT_PROFILES: Record<
  SkillAgentId,
  { displayName: string; layer: string }
> = {
  "discovery-analyst": { displayName: "需求分析师", layer: "L3" },
  "systems-architect": { displayName: "系统架构师", layer: "L3" },
  "prompt-architect": { displayName: "提示词总架构", layer: "L2" },
  engineer: { displayName: "工程执行", layer: "L3" },
  "qa-guardian": { displayName: "质量守护", layer: "L3" },
  "risk-compliance": { displayName: "合规风控", layer: "L3" },
  "delivery-editor": { displayName: "交付编辑", layer: "L3" },
  "reviewer-board": { displayName: "质量委员会", layer: "L4" },
  orchestrator: { displayName: "张明远 · 协调者", layer: "L1" },
};
