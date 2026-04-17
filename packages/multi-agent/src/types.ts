export type AgentId = "researcher" | "reviewer" | "synthesizer";

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
