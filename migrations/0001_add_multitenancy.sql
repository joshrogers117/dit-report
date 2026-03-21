-- Add user_id to projects
ALTER TABLE projects ADD COLUMN user_id TEXT NOT NULL DEFAULT '';

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  company TEXT DEFAULT '',
  subscription_status TEXT DEFAULT 'free',
  stripe_customer_id TEXT DEFAULT NULL,
  stripe_subscription_id TEXT DEFAULT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Index for fast project lookups by user
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);

-- Tag existing projects so they're not orphaned
UPDATE projects SET user_id = 'user_MIGRATION' WHERE user_id = '';
