import { runAgentPipeline } from "../agents.js";
import type { LlmClient, OrchestrationResult } from "../types.js";
import { MessageBus } from "../messageBus.js";
import { SKILL_TEAM_PIPELINE } from "./pipeline.js";

export class SkillTeamOrchestrator {
  constructor(
    private readonly llm: LlmClient,
    private readonly bus: MessageBus = new MessageBus(),
  ) {}

  getBus(): MessageBus {
    return this.bus;
  }

  async run(task: string): Promise<OrchestrationResult> {
    const trimmed = task.trim();
    if (!trimmed) {
      throw new Error("Task must be non-empty");
    }

    this.bus.publish("task:received", { task: trimmed });

    const turns = await runAgentPipeline(trimmed, this.llm, [], {
      pipeline: SKILL_TEAM_PIPELINE,
      hooks: {
        onAgentStart: (agentId) => {
          this.bus.publish("agent:started", { agentId, task: trimmed });
        },
        onAgentComplete: (agentId, output) => {
          this.bus.publish("agent:completed", {
            agentId,
            snippet: output.slice(0, 240),
          });
        },
      },
    });

    const finalAnswer = turns[turns.length - 1]?.output ?? "";
    this.bus.publish("orchestration:finished", { snippet: finalAnswer.slice(0, 240) });

    return {
      task: trimmed,
      turns,
      finalAnswer,
      team: "skill",
    };
  }
}
