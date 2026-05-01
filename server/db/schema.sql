CREATE TABLE IF NOT EXISTS crews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#6366f1',
  logo_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  crew_id INTEGER NOT NULL,
  soop_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_new INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  profile_img TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (crew_id) REFERENCES crews(id)
);

CREATE TABLE IF NOT EXISTS balloon_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  soop_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  day INTEGER NOT NULL DEFAULT 0,
  total_balloons INTEGER DEFAULT 0,
  daily_balloons INTEGER DEFAULT 0,
  fetched_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_snapshots_member_date
  ON balloon_snapshots(soop_id, year, month, day);

CREATE TABLE IF NOT EXISTS viewer_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  soop_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  total_viewers INTEGER DEFAULT 0,
  daily_viewers INTEGER DEFAULT 0,
  fetched_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_viewer_snapshots_member_date
  ON viewer_snapshots(soop_id, year, month);
