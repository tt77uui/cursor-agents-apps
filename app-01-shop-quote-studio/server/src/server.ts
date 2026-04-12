import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const PORT = Number(process.env.PORT ?? 3001);
const UNLOCK_CODE = process.env.UNLOCK_CODE ?? "demo-pro-unlock-2025";
const FREE_EXPORT_DAILY_LIMIT = Number(process.env.FREE_EXPORT_DAILY_LIMIT ?? 5);

const app = createApp({
  unlockCode: UNLOCK_CODE,
  freeExportDailyLimit: FREE_EXPORT_DAILY_LIMIT,
});

app.listen(PORT, () => {
  console.log(`[app01] server listening on http://localhost:${PORT}`);
});
