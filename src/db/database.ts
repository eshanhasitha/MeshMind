import Database from "better-sqlite3";

export const db = new Database("proxymaze.db");

db.exec(`
CREATE TABLE IF NOT EXISTS proxies (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  status TEXT NOT NULL,
  last_checked_at TEXT,
  consecutive_failures INTEGER DEFAULT 0,
  total_checks INTEGER DEFAULT 0,
  successful_checks INTEGER DEFAULT 0,
  uptime_percentage REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS proxy_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proxy_id TEXT NOT NULL,
  checked_at TEXT NOT NULL,
  status TEXT NOT NULL
);
`);