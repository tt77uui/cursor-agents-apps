export type SimpleAgentId = "researcher" | "reviewer" | "synthesizer";

export type SkillAgentId =
  | "discovery-analyst"
  | "systems-architect"
  | "prompt-architect"
  | "engineer"
  | "qa-guardian"
  | "risk-compliance"
  | "delivery-editor"
  | "reviewer-board"
  | "orchestrator";

export type AgentId = SimpleAgentId | SkillAgentId;

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  agentId?: AgentId;
  content: string;
}

export interface AgentTurn {
  agentId: AgentId;
  messages: ChatMessage[];
  output: string;
}

export interface OrchestrationResult {
  task: string;
  turns: AgentTurn[];
  finalAnswer: string;
  team?: "simple" | "skill";
}

export interface LlmCompleteInput {
  agentId: AgentId;
  messages: ChatMessage[];
}

export interface LlmClient {
  complete(input: LlmCompleteInput): Promise<string>;
}

export type MessageTopic =
  | "task:received"
  | "agent:started"
  | "agent:completed"
  | "orchestration:finished";

export interface BusPayload {
  task?: string;
  agentId?: AgentId;
  snippet?: string;
  error?: string;
}
