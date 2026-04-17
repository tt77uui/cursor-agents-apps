import { describe, expect, it } from "vitest";
import { EchoLlmClient } from "./llm.js";
import { Orchestrator } from "./orchestrator.js";
import { defaultPipelineOrder } from "./agents.js";

describe("Orchestrator", () => {
  it("runs three agents in order and emits bus events", async () => {
    const orch = new Orchestrator(new EchoLlmClient());
    const topics: string[] = [];
    const started: string[] = [];
    orch.getBus().subscribe("task:received", () => topics.push("task"));
    orch.getBus().subscribe("agent:started", (p) => {
      topics.push("start");
      if (p.agentId) started.push(p.agentId);
    });
    orch.getBus().subscribe("agent:completed", () => topics.push("done"));
    orch.getBus().subscribe("orchestration:finished", () => topics.push("fin"));

    const result = await orch.run("  hello task  ");

    expect(result.task).toBe("hello task");
    expect(result.turns.map((t) => t.agentId)).toEqual([...defaultPipelineOrder()]);
    expect(result.finalAnswer.startsWith("[synthesizer]")).toBe(true);
    expect(started).toEqual(["researcher", "reviewer", "synthesizer"]);
    expect(topics.filter((t) => t === "start")).toHaveLength(3);
    expect(topics.filter((t) => t === "done")).toHaveLength(3);
    expect(topics.includes("fin")).toBe(true);
  });

  it("rejects empty task", async () => {
    const orch = new Orchestrator(new EchoLlmClient());
    await expect(orch.run("   ")).rejects.toThrow(/non-empty/);
  });
});
