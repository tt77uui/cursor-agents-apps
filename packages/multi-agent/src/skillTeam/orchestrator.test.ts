import { describe, expect, it } from "vitest";
import { EchoLlmClient } from "../llm.js";
import { SKILL_TEAM_PIPELINE } from "./pipeline.js";
import { SkillTeamOrchestrator } from "./orchestrator.js";

describe("SkillTeamOrchestrator", () => {
  it("runs nine skill agents in order", async () => {
    const orch = new SkillTeamOrchestrator(new EchoLlmClient());
    const started: string[] = [];
    orch.getBus().subscribe("agent:started", (p) => {
      if (p.agentId) started.push(p.agentId);
    });

    const result = await orch.run("build a task tracker API");

    expect(result.team).toBe("skill");
    expect(result.turns.map((t) => t.agentId)).toEqual([...SKILL_TEAM_PIPELINE]);
    expect(started).toEqual([...SKILL_TEAM_PIPELINE]);
    expect(result.finalAnswer.startsWith("[orchestrator]")).toBe(true);
  });
});
