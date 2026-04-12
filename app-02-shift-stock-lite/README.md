# app-02-shift-stock-lite — 排班库存轻助手

面向 **小餐饮、便利店、美甲店** 等：轻量员工排班 + SKU 库存阈值提醒 + 周报表 CSV 导出（不做 HR 全套）。

## 技术栈

- React 18 + Vite + TypeScript（`client/`）
- Express + SQLite（`server/data/`）
- 端口：**API `3002`** · **开发前端 `5174`**

## 使用

```bash
npm install
npm run start -w app-02-shift-stock-lite
```

开发前端：<http://localhost:5174>

生产（先 build）：

```bash
cd app-02-shift-stock-lite
NODE_ENV=production PORT=3002 UNLOCK_CODE=你的码 node server/dist/server.js
```

### 环境变量（`server/.env.example`）

| 变量 | 说明 |
|------|------|
| `PORT` | 默认 `3002` |
| `UNLOCK_CODE` | Pro 解锁码 |
| `APP02_DB_PATH` | 可选 SQLite 路径 |

## 盈利模式

- **免费档**：员工 ≤3、库存 SKU ≤10、周 CSV 导出 ≤3 次/日（代码常量，可在 `server/src/app.ts` 的 `createApp` 配置中调整）。
- **Pro**：解锁后提高上限（演示为 30 员工 / 200 SKU / 无限报表逻辑）。
- **小额订阅（≤10 元/月）**：上线后用已授权支付开通订阅后，由你的服务写入「pro_unlocked」或改为远程鉴权。

## 脚本

- `./scripts/dev.sh`
- `./scripts/deploy.sh`：Compose 构建 `app02`

> 本仓库 **主推 App01**；App02 为投票第二选项，代码保留便于迭代。
