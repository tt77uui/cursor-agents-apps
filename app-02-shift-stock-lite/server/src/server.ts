import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const PORT = Number(process.env.PORT ?? 3002);
const UNLOCK_CODE = process.env.UNLOCK_CODE ?? "demo-pro-unlock-2025";

const app = createApp({
  unlockCode: UNLOCK_CODE,
  freeEmployeeLimit: 3,
  freeStockLimit: 10,
  freeReportDailyLimit: 3,
});

app.listen(PORT, () => {
  console.log(`[app02] server listening on http://localhost:${PORT}`);
});
