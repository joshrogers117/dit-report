CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  production_company TEXT DEFAULT '',
  client TEXT DEFAULT '',
  director TEXT DEFAULT '',
  producer TEXT DEFAULT '',
  dp TEXT DEFAULT '',
  first_ac TEXT DEFAULT '',
  dit_name TEXT DEFAULT '',
  dit_email TEXT DEFAULT '',
  dit_phone TEXT DEFAULT '',
  archived INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS shoot_days (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  date TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS benchmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day_id INTEGER NOT NULL REFERENCES shoot_days(id) ON DELETE CASCADE,
  drive_name TEXT NOT NULL DEFAULT '',
  write_speed REAL DEFAULT 0,
  read_speed REAL DEFAULT 0,
  capacity TEXT DEFAULT '',
  format TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cameras (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day_id INTEGER NOT NULL REFERENCES shoot_days(id) ON DELETE CASCADE,
  camera_name TEXT NOT NULL DEFAULT '',
  resolution TEXT DEFAULT '',
  codec TEXT DEFAULT '',
  colorspace TEXT DEFAULT '',
  lut TEXT DEFAULT '',
  fps TEXT DEFAULT '23.976',
  label TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS rolls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day_id INTEGER NOT NULL REFERENCES shoot_days(id) ON DELETE CASCADE,
  roll_name TEXT NOT NULL DEFAULT '',
  is_break INTEGER DEFAULT 0,
  card_serial TEXT DEFAULT '',
  gb REAL DEFAULT 0,
  duration_tc TEXT DEFAULT '00:00:00:00',
  frames INTEGER DEFAULT 0,
  master INTEGER DEFAULT 0,
  backup INTEGER DEFAULT 0,
  notes TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);
