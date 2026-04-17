import type { AgentId, ChatMessage, LlmClient, LlmCompleteInput } from "./types.js";
import { systemPromptFor } from "./prompts.js";

export class EchoLlmClient implements LlmClient {
  async complete(input: LlmCompleteInput): Promise<string> {
    const lastUser = [...input.messages].reverse().find((m) => m.role === "user");
    const seed = lastUser?.content ?? "";
    return `[${input.agentId}] ${seed.slice(0, 200)}${seed.length > 200 ? "…" : ""}`;
  }
}

export interface OpenAiCompatibleOptions {
  baseUrl?: string;
  model?: string;
  apiKey: string;
}

export class OpenAiCompatibleClient implements LlmClient {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly apiKey: string;

  constructor(opts: OpenAiCompatibleOptions) {
    this.baseUrl = (opts.baseUrl ?? "https://api.openai.com/v1").replace(/\/$/, "");
    this.model = opts.model ?? "gpt-4o-mini";
    this.apiKey = opts.apiKey;
  }

  async complete(input: LlmCompleteInput): Promise<string> {
    const system = systemPromptFor(input.agentId);
    const apiMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: system },
      ...input.messages.map((m) => ({
        role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: m.content,
      })),
    ];

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: apiMessages,
        temperature: 0.4,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`LLM HTTP ${res.status}: ${text.slice(0, 500)}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("LLM returned empty content");
    }
    return content.trim();
  }
}

export function buildMessagesForAgent(
  agentId: AgentId,
  task: string,
  prior: { agentId: AgentId; output: string }[],
): ChatMessage[] {
  const lines = prior.map((p) => `### ${p.agentId}\n${p.output}`);
  const context =
    prior.length === 0
      ? task
      : `${task}\n\n---\nPrior agent outputs:\n${lines.join("\n\n")}`;
  return [{ role: "user", content: context }];
}
