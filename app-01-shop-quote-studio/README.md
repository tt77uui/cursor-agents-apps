# app-01-shop-quote-studio — 报价单工坊

面向个体维修、家政、小批发等 **线下成交** 场景：用固定模板快速生成「报价单 / 收据」**文本草稿**，显著提示 **不构成法律意见**。

## 技术栈

- 前端：React 18 + Vite + TypeScript（`client/`）
- 后端：Node.js + Express + SQLite（`better-sqlite3`，`server/data/`）
- 端口：**API `3001`** · **开发前端 `5173`**

## 使用

```bash
# 在仓库根目录
npm install
npm run start -w app-01-shop-quote-studio
```

浏览器打开 <http://localhost:5173>（开发模式下 Vite 代理 `/api` 到 3001）。

生产（需先 `npm run build -w app-01-shop-quote-studio`）：

```bash
cd app-01-shop-quote-studio
NODE_ENV=production PORT=3001 UNLOCK_CODE=你的码 node server/dist/server.js
```

访问 <http://localhost:3001>（由 Express 托管 `client/dist`）。

### 环境变量（`server/.env.example`）

| 变量 | 说明 |
|------|------|
| `PORT` | 默认 `3001` |
| `UNLOCK_CODE` | Pro 解锁码（演示默认 `demo-pro-unlock-2025`） |
| `FREE_EXPORT_DAILY_LIMIT` | 非 Pro 用户每日导出上限，默认 `5` |
| `APP01_DB_PATH` | 可选，自定义 SQLite 文件绝对路径 |

## 盈利模式（已实现逻辑 + 上线替换说明）

- **基础免费**：基础模板 + 本地保存列表。
- **Pro 解锁**：更多模板（如套餐报价）；解锁码由环境变量配置。
- **按次数**：非 Pro 用户每日导出次数写入 SQLite，超限返回 `402`。
- **上线后**：将「人工发码 / 小额订阅」对接 **已授权** 的支付或会员系统；收款完成后由你的后台写入用户解锁状态（或替换为签名 License）。**勿在代码中硬编码未授权支付 API。**

## 非侵入式广告

前端预留横幅位（`App.tsx`），可替换为合规静态物料或联盟链接（禁止弹窗）。

## 本地脚本

- `./scripts/dev.sh`：安装依赖并 `npm run start`
- `./scripts/deploy.sh`：从仓库根调用 Docker Compose 构建 `app01`（需本机安装 Docker）
