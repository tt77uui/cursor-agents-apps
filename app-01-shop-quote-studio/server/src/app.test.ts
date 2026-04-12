import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "./app.js";

const dbPath = path.join(os.tmpdir(), `app01-test-${Date.now()}.db`);

beforeAll(() => {
  process.env.APP01_DB_PATH = dbPath;
});

afterAll(() => {
  try {
    fs.unlinkSync(dbPath);
  } catch {
    /* ignore */
  }
});

describe("createApp", () => {
  const app = createApp({ unlockCode: "secret", freeExportDailyLimit: 2 });

  it("health", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("unlock and list templates includes pro", async () => {
    let res = await request(app).get("/api/templates");
    expect(res.status).toBe(200);
    expect(res.body.templates.some((t: { id: string }) => t.id === "quote_pro_bundle")).toBe(
      false
    );

    res = await request(app).post("/api/unlock").send({ code: "wrong" });
    expect(res.status).toBe(403);

    res = await request(app).post("/api/unlock").send({ code: "secret" });
    expect(res.status).toBe(200);

    res = await request(app).get("/api/templates");
    expect(res.body.templates.some((t: { id: string }) => t.id === "quote_pro_bundle")).toBe(
      true
    );
  });
});
