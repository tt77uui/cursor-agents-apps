import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { getSetting, openDb, setSetting } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type App02Config = {
  unlockCode: string;
  freeEmployeeLimit: number;
  freeStockLimit: number;
  freeReportDailyLimit: number;
};

export function createApp(config: App02Config) {
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
  app.use("/api", rateLimit({ windowMs: 60_000, max: 120 }));

  function isPro(db: ReturnType<typeof openDb>) {
    return getSetting(db, "pro_unlocked") === "1";
  }

  function employeeCap(db: ReturnType<typeof openDb>) {
    return isPro(db) ? 30 : config.freeEmployeeLimit;
  }

  function stockCap(db: ReturnType<typeof openDb>) {
    return isPro(db) ? 200 : config.freeStockLimit;
  }

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function reportCount(db: ReturnType<typeof openDb>) {
    const day = todayKey();
    const row = db.prepare("SELECT count FROM usage_reports WHERE day = ?").get(day) as
      | { count: number }
      | undefined;
    return row?.count ?? 0;
  }

  function bumpReport(db: ReturnType<typeof openDb>) {
    const day = todayKey();
    db.prepare(
      `INSERT INTO usage_reports (day, count) VALUES (?, 1)
       ON CONFLICT(day) DO UPDATE SET count = count + 1`
    ).run(day);
  }

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, app: "app-02-shift-stock-lite" });
  });

  app.get("/api/meta", (_req, res) => {
    const db = openDb();
    try {
      const emp = db.prepare("SELECT COUNT(*) as c FROM employees").get() as { c: number };
      const stock = db.prepare("SELECT COUNT(*) as c FROM stock_items").get() as { c: number };
      const low = db
        .prepare(
          "SELECT COUNT(*) as c FROM stock_items WHERE qty <= threshold AND threshold > 0"
        )
        .get() as { c: number };
      res.json({
        proUnlocked: isPro(db),
        employees: emp.c,
        employeeCap: employeeCap(db),
        stockItems: stock.c,
        stockCap: stockCap(db),
        lowStockAlerts: low.c,
        reportExportsToday: reportCount(db),
        reportLimitFree: config.freeReportDailyLimit,
      });
    } finally {
      db.close();
    }
  });

  const unlockSchema = z.object({ code: z.string().min(1).max(200) });
  app.post("/api/unlock", (req, res) => {
    const parsed = unlockSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
    if (parsed.data.code !== config.unlockCode) return res.status(403).json({ error: "invalid_code" });
    const db = openDb();
    try {
      setSetting(db, "pro_unlocked", "1");
      res.json({ ok: true });
    } finally {
      db.close();
    }
  });

  app.get("/api/employees", (_req, res) => {
    const db = openDb();
    try {
      const rows = db
        .prepare("SELECT id, name, created_at as createdAt FROM employees ORDER BY name ASC")
        .all();
      res.json({ employees: rows });
    } finally {
      db.close();
    }
  });

  const employeeCreate = z.object({ name: z.string().min(1).max(80) });
  app.post("/api/employees", (req, res) => {
    const parsed = employeeCreate.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
    const db = openDb();
    try {
      const count = (db.prepare("SELECT COUNT(*) as c FROM employees").get() as { c: number }).c;
      if (count >= employeeCap(db)) {
        return res.status(402).json({ error: "employee_limit", cap: employeeCap(db) });
      }
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      db.prepare("INSERT INTO employees (id, name, created_at) VALUES (?,?,?)").run(
        id,
        parsed.data.name,
        now
      );
      res.status(201).json({ id, name: parsed.data.name, createdAt: now });
    } finally {
      db.close();
    }
  });

  const idParam = z.object({ id: z.string().uuid() });
  app.delete("/api/employees/:id", (req, res) => {
    const p = idParam.safeParse(req.params);
    if (!p.success) return res.status(400).json({ error: "invalid_id" });
    const db = openDb();
    try {
      db.prepare("DELETE FROM shifts WHERE employee_id = ?").run(p.data.id);
      const r = db.prepare("DELETE FROM employees WHERE id = ?").run(p.data.id);
      if (r.changes === 0) return res.status(404).json({ error: "not_found" });
      res.json({ ok: true });
    } finally {
      db.close();
    }
  });

  const shiftCreate = z.object({
    employeeId: z.string().uuid(),
    shiftDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    slot: z.enum(["早班", "中班", "晚班", "休息"]),
    note: z.string().max(200).optional(),
  });

  app.get("/api/shifts", (req, res) => {
    const from = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(req.query.from);
    const to = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(req.query.to);
    if (!from.success || !to.success) {
      return res.status(400).json({ error: "invalid_range" });
    }
    const db = openDb();
    try {
      const rows = db
        .prepare(
          `SELECT s.id, s.employee_id as employeeId, e.name as employeeName,
                  s.shift_date as shiftDate, s.slot, s.note, s.created_at as createdAt
           FROM shifts s JOIN employees e ON e.id = s.employee_id
           WHERE s.shift_date BETWEEN ? AND ?
           ORDER BY s.shift_date ASC, e.name ASC`
        )
        .all(from.data, to.data);
      res.json({ shifts: rows });
    } finally {
      db.close();
    }
  });

  app.post("/api/shifts", (req, res) => {
    const parsed = shiftCreate.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
    const db = openDb();
    try {
      const exists = db
        .prepare("SELECT id FROM employees WHERE id = ?")
        .get(parsed.data.employeeId) as { id: string } | undefined;
      if (!exists) return res.status(400).json({ error: "unknown_employee" });
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      db.prepare(
        "INSERT INTO shifts (id, employee_id, shift_date, slot, note, created_at) VALUES (?,?,?,?,?,?)"
      ).run(
        id,
        parsed.data.employeeId,
        parsed.data.shiftDate,
        parsed.data.slot,
        parsed.data.note ?? null,
        now
      );
      res.status(201).json({ id, ...parsed.data, createdAt: now });
    } finally {
      db.close();
    }
  });

  app.delete("/api/shifts/:id", (req, res) => {
    const p = idParam.safeParse(req.params);
    if (!p.success) return res.status(400).json({ error: "invalid_id" });
    const db = openDb();
    try {
      const r = db.prepare("DELETE FROM shifts WHERE id = ?").run(p.data.id);
      if (r.changes === 0) return res.status(404).json({ error: "not_found" });
      res.json({ ok: true });
    } finally {
      db.close();
    }
  });

  const stockUpsert = z.object({
    name: z.string().min(1).max(120),
    qty: z.number().finite(),
    threshold: z.number().finite().nonnegative(),
    unit: z.string().min(1).max(10).default("件"),
  });

  app.get("/api/stock", (_req, res) => {
    const db = openDb();
    try {
      const rows = db
        .prepare(
          "SELECT id, name, qty, threshold, unit, updated_at as updatedAt FROM stock_items ORDER BY name ASC"
        )
        .all();
      res.json({ items: rows });
    } finally {
      db.close();
    }
  });

  app.post("/api/stock", (req, res) => {
    const parsed = stockUpsert.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
    const db = openDb();
    try {
      const count = (db.prepare("SELECT COUNT(*) as c FROM stock_items").get() as { c: number }).c;
      if (count >= stockCap(db)) {
        return res.status(402).json({ error: "stock_limit", cap: stockCap(db) });
      }
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      db.prepare(
        "INSERT INTO stock_items (id, name, qty, threshold, unit, updated_at) VALUES (?,?,?,?,?,?)"
      ).run(id, parsed.data.name, parsed.data.qty, parsed.data.threshold, parsed.data.unit, now);
      res.status(201).json({ id, ...parsed.data, updatedAt: now });
    } finally {
      db.close();
    }
  });

  app.put("/api/stock/:id", (req, res) => {
    const p = idParam.safeParse(req.params);
    if (!p.success) return res.status(400).json({ error: "invalid_id" });
    const parsed = stockUpsert.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "invalid_body" });
    const db = openDb();
    try {
      const now = new Date().toISOString();
      const r = db
        .prepare(
          "UPDATE stock_items SET name = ?, qty = ?, threshold = ?, unit = ?, updated_at = ? WHERE id = ?"
        )
        .run(parsed.data.name, parsed.data.qty, parsed.data.threshold, parsed.data.unit, now, p.data.id);
      if (r.changes === 0) return res.status(404).json({ error: "not_found" });
      res.json({ id: p.data.id, ...parsed.data, updatedAt: now });
    } finally {
      db.close();
    }
  });

  app.delete("/api/stock/:id", (req, res) => {
    const p = idParam.safeParse(req.params);
    if (!p.success) return res.status(400).json({ error: "invalid_id" });
    const db = openDb();
    try {
      const r = db.prepare("DELETE FROM stock_items WHERE id = ?").run(p.data.id);
      if (r.changes === 0) return res.status(404).json({ error: "not_found" });
      res.json({ ok: true });
    } finally {
      db.close();
    }
  });

  app.get("/api/alerts/low-stock", (_req, res) => {
    const db = openDb();
    try {
      const rows = db
        .prepare(
          `SELECT id, name, qty, threshold, unit FROM stock_items
           WHERE qty <= threshold AND threshold > 0
           ORDER BY (threshold - qty) DESC`
        )
        .all();
      res.json({ alerts: rows });
    } finally {
      db.close();
    }
  });

  app.get("/api/report/week.csv", (req, res) => {
    const anchor = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(req.query.anchor);
    if (!anchor.success) return res.status(400).json({ error: "invalid_anchor" });
    const db = openDb();
    try {
      if (!isPro(db)) {
        const c = reportCount(db);
        if (c >= config.freeReportDailyLimit) {
          return res.status(402).json({ error: "report_limit", limit: config.freeReportDailyLimit });
        }
      }
      bumpReport(db);
      const d0 = new Date(`${anchor.data}T00:00:00`);
      const from = new Date(d0);
      from.setDate(from.getDate() - from.getDay());
      const to = new Date(from);
      to.setDate(to.getDate() + 6);
      const fromStr = from.toISOString().slice(0, 10);
      const toStr = to.toISOString().slice(0, 10);
      const shifts = db
        .prepare(
          `SELECT e.name as employee, s.shift_date as date, s.slot, s.note
           FROM shifts s JOIN employees e ON e.id = s.employee_id
           WHERE s.shift_date BETWEEN ? AND ?
           ORDER BY s.shift_date ASC, e.name ASC`
        )
        .all(fromStr, toStr) as { employee: string; date: string; slot: string; note: string | null }[];
      const stock = db
        .prepare("SELECT name, qty, threshold, unit FROM stock_items ORDER BY name ASC")
        .all() as { name: string; qty: number; threshold: number; unit: string }[];

      const lines: string[] = [];
      lines.push("类别,员工,日期,班次,备注");
      for (const s of shifts) {
        lines.push(
          `排班,${csv(s.employee)},${csv(s.date)},${csv(s.slot)},${csv(s.note ?? "")}`
        );
      }
      lines.push("");
      lines.push("类别,品名,数量,阈值,单位,低库存");
      for (const it of stock) {
        const low = it.threshold > 0 && it.qty <= it.threshold ? "是" : "否";
        lines.push(`库存,${csv(it.name)},${it.qty},${it.threshold},${csv(it.unit)},${low}`);
      }
      res.type("text/csv; charset=utf-8").send(lines.join("\n"));
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

function csv(s: string) {
  const needs = /[",\n]/.test(s);
  const esc = s.replace(/"/g, '""');
  return needs ? `"${esc}"` : esc;
}
