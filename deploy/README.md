# 部署说明

在仓库根目录执行：

```bash
docker compose -f deploy/docker-compose.yml up -d --build
```

- **App01（报价单工坊）**：<http://localhost:8081>
- **App02（排班库存轻助手）**：<http://localhost:8082>

环境变量可在 shell 中导出或使用 `.env`（Compose 自动读取）：

- `APP01_UNLOCK_CODE` / `APP02_UNLOCK_CODE`：Pro 解锁码（演示默认见根 `.env.example`）

数据持久化在命名卷 `app01_data` / `app02_data`（SQLite 目录）。
