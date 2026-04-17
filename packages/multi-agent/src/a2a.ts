import type { AgentId } from "./types.js";

export type TaskPriority = "high" | "medium" | "low";

export type TaskStatus = "pending" | "in_progress" | "completed" | "rejected";

export interface A2AHeader {
  sender: AgentId;
  receiver: AgentId;
  task_id: string;
  timestamp: string;
  priority: TaskPriority;
}

export interface A2ABody {
  task_type: string;
  requirements: string;
  deadline?: string;
  dependencies: string[];
}

export interface A2AContext {
  project_id: string;
  status: TaskStatus;
  previous_communications: string[];
}

export interface A2AMessage {
  header: A2AHeader;
  body: A2ABody;
  context: A2AContext;
}

export function createTaskEnvelope(
  sender: AgentId,
  receiver: AgentId,
  projectId: string,
  taskId: string,
  body: Omit<A2ABody, "dependencies"> & { dependencies?: string[] },
  opts?: { priority?: TaskPriority; previousIds?: string[] },
): A2AMessage {
  const now = new Date().toISOString();
  return {
    header: {
      sender,
      receiver,
      task_id: taskId,
      timestamp: now,
      priority: opts?.priority ?? "medium",
    },
    body: {
      task_type: body.task_type,
      requirements: body.requirements,
      deadline: body.deadline,
      dependencies: body.dependencies ?? [],
    },
    context: {
      project_id: projectId,
      status: "pending",
      previous_communications: opts?.previousIds ?? [],
    },
  };
}
