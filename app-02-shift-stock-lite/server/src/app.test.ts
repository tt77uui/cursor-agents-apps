import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "./app.js";

const dbPath = path.join(os.tmpdir(), `app02-test-${Date.now()}.db`);

beforeAll(() => {
  process.env.APP02_DB_PATH = dbPath;
});

afterAll(() => {
  try {
    fs.unlinkSync(dbPath);
  } catch {
    /* ignore */
  }
});

describe("app02 createApp", () => {
  const app = createApp({
    unlockCode: "x",
    freeEmployeeLimit: 1,
    freeStockLimit: 1,
    freeReportDailyLimit: 1,
  });

  it("health", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
  });

  it("employee limit then unlock", async () => {
    let res = await request(app).post("/api/employees").send({ name: "A" });
    expect(res.status).toBe(201);
    res = await request(app).post("/api/employees").send({ name: "B" });
    expect(res.status).toBe(402);

    res = await request(app).post("/api/unlock").send({ code: "x" });
    expect(res.status).toBe(200);

    res = await request(app).post("/api/employees").send({ name: "B" });
    expect(res.status).toBe(201);
  });
});
