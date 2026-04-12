import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { getSetting, openDb, setSetting } from "./db.js";
import { renderTemplate, TEMPLATES } from "./templates.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type AppConfig = {
  unlockCode: string;
  freeExportDailyLimit: number;
};

export function createApp(config: AppConfig) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      origin: [/http:\/\/localhost:\d+/, /http:\/\/127\.0\.0\.1:\d+/],
      credentials: true,
    })
  );
  app.use(express.json({ limit: "256kb" }));

  const apiLimiter = rateLimit({ windowMs: 60_000, max: 120 });
  app.use("/api", apiLimiter);

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function isPro(db: ReturnType<typeof openDb>) {
    return getSetting(db, "pro_unlocked") === "1";
  }

  function getExportCount(db: ReturnType<typeof openDb>) {
    const day = todayKey();
    const row = db.prepare("SELECT count FROM usage_exports WHERE day = ?").get(day) as
      | { count: number }
      | undefined;
    return row?.count ?? 0;
  }

  function incrementExport(db: ReturnType<typeof openDb>) {
    const day = todayKey();
    db.prepare(
      `INSERT INTO usage_exports (day, count) VALUES (?, 1)
       ON CONFLICT(day) DO UPDATE SET count = count + 1`
    ).run(day);
  }

  const quoteCreateSchema = z.object({
    title: z.string().min(1).max(200),
    templateId: z.string().min(1),
    values: z.record(z.string()),
  });
  type QuotePayload = { templateId: string; values: Record<string, string> };

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, app: "app-01-shop-quote-studio" });
  });

  app.get("/api/meta", (_req, res) => {
    const db = openDb();
    try {
      res.json({
        proUnlocked: isPro(db),
        exportCountToday: getExportCount(db),
        exportLimitFree: config.freeExportDailyLimit,
      });
    } finally {
      db.close();
    }
  });

  app.get("/api/templates", (_req, res) => {
    const db = openDb();
    try {
      const pro = isPro(db);
      const list = TEMPLATES.filter((t) => !t.proOnly || pro).map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        proOnly: t.proOnly,
        disclaimer: t.disclaimer,
        fields: t.fields,
      }));
      res.json({ templates: list });
    } finally {
      db.close();
    }
  });

  const unlockSchema = z.object({ code: z.string().min(1).max(200) });

  app.post("/api/unlock", (req, res) => {
    const parsed = unlockSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body" });
      return;
    }
    if (parsed.data.code !== config.unlockCode) {
      res.status(403).json({ error: "invalid_code" });
      return;
    }
    const db = openDb();
    try {
      setSetting(db, "pro_unlocked", "1");
      res.json({ ok: true, proUnlocked: true });
    } finally {
      db.close();
    }
  });

  app.get("/api/quotes", (_req, res) => {
    const db = openDb();
    try {
      const rows = db
        .prepare(
          "SELECT id, title, template_id as templateId, payload_json as payloadJson, created_at as createdAt, updated_at as updatedAt FROM quotes ORDER BY updated_at DESC"
        )
        .all() as {
        id: string;
        title: string;
        templateId: string;
        payloadJson: string;
        createdAt: string;
        updatedAt: string;
      }[];
      res.json({
        quotes: rows.map((r) => ({
          ...r,
          payload: JSON.parse(r.payloadJson) as QuotePayload,
        })),
      });
    } finally {
      db.close();
    }
  });

  app.post("/api/quotes", (req, res) => {
    const parsed = quoteCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const tpl = TEMPLATES.find((t) => t.id === parsed.data.templateId);
    if (!tpl) {
      res.status(400).json({ error: "unknown_template" });
      return;
    }
    const db = openDb();
    try {
      if (tpl.proOnly && !isPro(db)) {
        res.status(402).json({ error: "pro_required" });
        return;
      }
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const payload = {
        templateId: parsed.data.templateId,
        values: parsed.data.values,
      };
      db.prepare(
        "INSERT INTO quotes (id, title, template_id, payload_json, created_at, updated_at) VALUES (?,?,?,?,?,?)"
      ).run(id, parsed.data.title, parsed.data.templateId, JSON.stringify(payload), now, now);
      res
        .status(201)
        .json({ id, title: parsed.data.title, payload, createdAt: now, updatedAt: now });
    } finally {
      db.close();
    }
  });

  const idParam = z.object({ id: z.string().uuid() });

  app.put("/api/quotes/:id", (req, res) => {
    const idParsed = idParam.safeParse(req.params);
    if (!idParsed.success) {
      res.status(400).json({ error: "invalid_id" });
      return;
    }
    const parsed = quoteCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body" });
      return;
    }
    const tpl = TEMPLATES.find((t) => t.id === parsed.data.templateId);
    if (!tpl) {
      res.status(400).json({ error: "unknown_template" });
      return;
    }
    const db = openDb();
    try {
      if (tpl.proOnly && !isPro(db)) {
        res.status(402).json({ error: "pro_required" });
        return;
      }
      const existing = db
        .prepare("SELECT id FROM quotes WHERE id = ?")
        .get(idParsed.data.id) as { id: string } | undefined;
      if (!existing) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      const now = new Date().toISOString();
      const payload = { templateId: parsed.data.templateId, values: parsed.data.values };
      db.prepare(
        "UPDATE quotes SET title = ?, template_id = ?, payload_json = ?, updated_at = ? WHERE id = ?"
      ).run(
        parsed.data.title,
        parsed.data.templateId,
        JSON.stringify(payload),
        now,
        idParsed.data.id
      );
      res.json({ id: idParsed.data.id, title: parsed.data.title, payload, updatedAt: now });
    } finally {
      db.close();
    }
  });

  app.delete("/api/quotes/:id", (req, res) => {
    const idParsed = idParam.safeParse(req.params);
    if (!idParsed.success) {
      res.status(400).json({ error: "invalid_id" });
      return;
    }
    const db = openDb();
    try {
      const r = db.prepare("DELETE FROM quotes WHERE id = ?").run(idParsed.data.id);
      if (r.changes === 0) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      res.json({ ok: true });
    } finally {
      db.close();
    }
  });

  app.post("/api/quotes/:id/export", (req, res) => {
    const idParsed = idParam.safeParse(req.params);
    if (!idParsed.success) {
      res.status(400).json({ error: "invalid_id" });
      return;
    }
    const db = openDb();
    try {
      const row = db
        .prepare(
          "SELECT template_id as templateId, payload_json as payloadJson FROM quotes WHERE id = ?"
        )
        .get(idParsed.data.id) as { templateId: string; payloadJson: string } | undefined;
      if (!row) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      const payload = JSON.parse(row.payloadJson) as QuotePayload;
      const tpl = TEMPLATES.find((t) => t.id === payload.templateId);
      if (!tpl) {
        res.status(400).json({ error: "unknown_template" });
        return;
      }
      if (tpl.proOnly && !isPro(db)) {
        res.status(402).json({ error: "pro_required" });
        return;
      }
      if (!isPro(db)) {
        const c = getExportCount(db);
        if (c >= config.freeExportDailyLimit) {
          res.status(402).json({ error: "export_limit", limit: config.freeExportDailyLimit });
          return;
        }
      }
      incrementExport(db);
      const text = `${tpl.disclaimer}\n\n${renderTemplate(tpl.body, payload.values)}`;
      const accept = String(req.headers.accept ?? "");
      if (accept.includes("text/plain")) {
        res.type("text/plain; charset=utf-8").send(text);
        return;
      }
      res.json({ text, exportedToday: getExportCount(db) });
    } finally {
      db.close();
    }
  });

  if (process.env.NODE_ENV === "production") {
    const clientDist = path.join(__dirname, "..", "..", "client", "dist");
    app.use(express.static(clientDist));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(clientDist, "index.html"));
    });
  }

  return app;
}
