# 四角色分工（单仓协作说明）

本仓库用文档与提交纪律模拟多智能体并行：

| 角色 | 职责 | 主要产出 |
|------|------|----------|
| Agent 1 产品 | 创意、合规边界、盈利模式 | `docs/agent1-ideas.md` |
| Agent 2 前端 | React/Vite、响应式、关键路径 UX | `app-*/client/` |
| Agent 3 后端 | Express API、SQLite、部署 | `app-*/server/`、`deploy/` |
| Agent 4 QA | 测试、安全基线、清单 | `docs/qa-checklist.md`、`*.test.ts` |

合并前自检：`npm run lint && npm run test && npm run build`
