# cursor-agents-apps

Monorepo：**两个**「小而美」工具（React + Node + SQLite），根目录一键并行启动。

## 应用

| 目录 | 名称 | 开发端口（前端 / API） |
|------|------|-------------------------|
| `app-01-shop-quote-studio` | 报价单工坊 | 5173 / 3001 |
| `app-02-shift-stock-lite` | 排班库存轻助手 | 5174 / 3002 |
| `packages/voice-chat` | 语音输入·文字回复（Web Speech） | 5175 |

## 一键启动

```bash
npm install
npm run start
```

并行启动上述两个 workspace（见 `package.json` scripts）。

**语音聊天演示页**（Chrome 推荐）：

```bash
npm run start -w voice-chat
```

详见 `packages/voice-chat/README.md`。

**生产仅启动主推 App01**：

```bash
npm run build -w app-01-shop-quote-studio
npm run start:prod
```

## 其他命令

```bash
npm run lint
npm run test
npm run build   # 构建两个应用
```

## 文档

- 创意与投票：`docs/agent1-ideas.md`
- 最终选型：`docs/final-selection.md`
- QA 清单：`docs/qa-checklist.md`
- 总结报告：`FINAL_REPORT.md`
- 进度：`docs/progress-report-*.md`
- Docker：`deploy/README.md`

## 环境变量示例

复制根目录 `.env.example` 为 `.env`（可选）；各应用另有 `server/.env.example`。

## License

见仓库根目录 `LICENSE`。
