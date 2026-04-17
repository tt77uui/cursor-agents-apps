#!/usr/bin/env node
import { EchoLlmClient, OpenAiCompatibleClient } from "./llm.js";
import { Orchestrator } from "./orchestrator.js";
import { SkillTeamOrchestrator } from "./skillTeam/orchestrator.js";
import { SKILL_TEAM_PIPELINE } from "./skillTeam/pipeline.js";

function printHelp(): void {
  console.log(`multi-agent — 多智能体编排 CLI

默认模式：researcher → reviewer → synthesizer（三角色）

技能团队模式（--skill）：Apex AI Guild — 九角色项目交付流水线
  ${SKILL_TEAM_PIPELINE.join(" → ")}

用法:
  multi-agent "你的任务描述"
  multi-agent --skill "你的项目目标与约束"
  multi-agent --help

环境变量（可选）:
  MULTI_AGENT_API_KEY   OpenAI 兼容 API 密钥
  MULTI_AGENT_BASE_URL  默认 https://api.openai.com/v1
  MULTI_AGENT_MODEL     默认 gpt-4o-mini

未设置 MULTI_AGENT_API_KEY 时使用本地 Echo 模式（仅用于演示管线，不产生真实回答）。
`);
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv[0] === "--help" || argv[0] === "-h") {
    printHelp();
    process.exit(argv.length === 0 ? 1 : 0);
  }

  let skillMode = false;
  if (argv[0] === "--skill") {
    skillMode = true;
    argv.shift();
  }

  const task = argv.join(" ").trim();
  const apiKey = process.env.MULTI_AGENT_API_KEY?.trim();
  const llm = apiKey
    ? new OpenAiCompatibleClient({
        apiKey,
        baseUrl: process.env.MULTI_AGENT_BASE_URL,
        model: process.env.MULTI_AGENT_MODEL,
      })
    : new EchoLlmClient();

  if (!apiKey) {
    console.error(
      "提示: 未设置 MULTI_AGENT_API_KEY，使用 Echo 模式。设置密钥后可调用真实 LLM。\n",
    );
  }

  const orchestrator = skillMode ? new SkillTeamOrchestrator(llm) : new Orchestrator(llm);
  orchestrator.getBus().subscribe("agent:started", (p) => {
    console.error(`→ [${p.agentId}] 开始`);
  });
  orchestrator.getBus().subscribe("agent:completed", (p) => {
    console.error(`✓ [${p.agentId}] 完成`);
  });

  orchestrator
    .run(task)
    .then((result) => {
      const label = skillMode ? "协调者 orchestrator（最终交付包）" : "synthesizer";
      console.log(`\n--- 最终输出 (${label}) ---\n`);
      console.log(result.finalAnswer);
    })
    .catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("错误:", msg);
      process.exit(1);
    });
}

main();
