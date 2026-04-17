import type { AgentId, AgentTurn, ChatMessage, LlmClient } from "./types.js";
import { buildMessagesForAgent } from "./llm.js";
import { systemPromptFor } from "./prompts.js";

const DEFAULT_PIPELINE: AgentId[] = ["researcher", "reviewer", "synthesizer"];

export interface PipelineHooks {
  onAgentStart?: (agentId: AgentId) => void;
  onAgentComplete?: (agentId: AgentId, output: string) => void;
}

export interface RunPipelineOptions {
  pipeline?: readonly AgentId[];
  hooks?: PipelineHooks;
}

export async function runAgentPipeline(
  task: string,
  llm: LlmClient,
  prior: { agentId: AgentId; output: string }[] = [],
  options?: RunPipelineOptions | PipelineHooks,
): Promise<AgentTurn[]> {
  const normalized =
    options && ("pipeline" in options || !("onAgentStart" in options))
      ? (options as RunPipelineOptions)
      : { hooks: options as PipelineHooks };

  const pipeline = [...(normalized.pipeline ?? DEFAULT_PIPELINE)];
  const hooks = normalized.hooks;

  const turns: AgentTurn[] = [];
  const acc = [...prior];

  for (const agentId of pipeline) {
    hooks?.onAgentStart?.(agentId);
    const userMessages = buildMessagesForAgent(agentId, task, acc);
    const messages: ChatMessage[] = [
      { role: "system", content: systemPromptFor(agentId), agentId },
      ...userMessages.map((m) => ({ ...m, agentId })),
    ];
    const output = await llm.complete({ agentId, messages: userMessages });
    hooks?.onAgentComplete?.(agentId, output);
    const turn: AgentTurn = { agentId, messages, output };
    turns.push(turn);
    acc.push({ agentId, output });
  }

  return turns;
}

export function defaultPipelineOrder(): readonly AgentId[] {
  return DEFAULT_PIPELINE;
}
