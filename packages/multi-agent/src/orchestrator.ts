import { runAgentPipeline } from "./agents.js";
import type { LlmClient, OrchestrationResult } from "./types.js";
import { MessageBus } from "./messageBus.js";

export class Orchestrator {
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

    const pipelineTurns = await runAgentPipeline(trimmed, this.llm, [], {
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

    const finalAnswer = pipelineTurns[pipelineTurns.length - 1]?.output ?? "";
    this.bus.publish("orchestration:finished", { snippet: finalAnswer.slice(0, 240) });

    return { task: trimmed, turns: pipelineTurns, finalAnswer, team: "simple" };
  }
}
