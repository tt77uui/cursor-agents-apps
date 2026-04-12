# QA 门禁清单（Agent 4）— 已全部勾选

## 安全

- [x] Helmet 响应头
- [x] CORS 限制为 localhost / 127.0.0.1 开发源
- [x] `/api` 速率限制
- [x] JSON body 大小限制（256kb）
- [x] Zod 输入校验（关键 API）
- [x] SQLite 参数化查询（无字符串拼接 SQL）
- [x] 无 `eval` / 无动态 `Function`
- [x] 密钥与解锁码来自环境变量（`.env.example` 文档化）

## 功能冒烟

- [x] App01：`/api/health`、模板列表、创建报价、导出、解锁 Pro
- [x] App02：`/api/health`、员工/排班/库存 CRUD、低库存、周 CSV、解锁
- [x] 自动化测试：`npm run test`（两应用 supertest）

## 合规

- [x] 无医疗/法律意见/金融投资建议/加密货币
- [x] 报价模板含「非法律意见」免责声明
- [x] 无未授权第三方 API 调用

## 构建与静态检查

- [x] `npm run build`（两应用）
- [x] `npm run lint`
