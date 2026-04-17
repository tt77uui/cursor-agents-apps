import { describe, expect, it } from "vitest";
import { createTaskEnvelope } from "./a2a.js";

describe("A2A envelope", () => {
  it("builds a valid message shape", () => {
    const msg = createTaskEnvelope(
      "orchestrator",
      "engineer",
      "proj-001",
      "T-20260417-001",
      {
        task_type: "implementation",
        requirements: "Add health check endpoint",
        deadline: "2026-04-20",
        dependencies: ["T-20260417-000"],
      },
      { priority: "high", previousIds: ["mid-1"] },
    );

    expect(msg.header.sender).toBe("orchestrator");
    expect(msg.header.receiver).toBe("engineer");
    expect(msg.header.task_id).toBe("T-20260417-001");
    expect(msg.body.dependencies).toEqual(["T-20260417-000"]);
    expect(msg.context.project_id).toBe("proj-001");
    expect(msg.context.previous_communications).toEqual(["mid-1"]);
  });
});
