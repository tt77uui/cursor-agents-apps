import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveDbPath() {
  const override = process.env.APP02_DB_PATH;
  if (override) return override;
  const dataDir = path.join(__dirname, "..", "data");
  fs.mkdirSync(dataDir, { recursive: true });
  return path.join(dataDir, "app02.db");
}

export function openDb(): Database.Database {
  const dbPath = resolveDbPath();
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  initSchema(db);
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS shifts (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      shift_date TEXT NOT NULL,
      slot TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(shift_date);
    CREATE TABLE IF NOT EXISTS stock_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      qty REAL NOT NULL DEFAULT 0,
      threshold REAL NOT NULL DEFAULT 0,
      unit TEXT NOT NULL DEFAULT '件',
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS usage_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      UNIQUE(day)
    );
  `);
  const row = db.prepare("SELECT value FROM settings WHERE key = 'schema_version'").get() as
    | { value: string }
    | undefined;
  if (!row) {
    db.prepare("INSERT INTO settings (key, value) VALUES ('schema_version', '1')").run();
    db.prepare("INSERT INTO settings (key, value) VALUES ('pro_unlocked', '0')").run();
  }
}

export function getSetting(db: Database.Database, key: string): string | undefined {
  const r = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return r?.value;
}

export function setSetting(db: Database.Database, key: string, value: string) {
  db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(key, value);
}
