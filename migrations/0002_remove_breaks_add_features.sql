DELETE FROM rolls WHERE is_break = 1;
ALTER TABLE rolls DROP COLUMN is_break;
ALTER TABLE rolls DROP COLUMN frames;
ALTER TABLE rolls ADD COLUMN camera_id INTEGER;
ALTER TABLE projects ADD COLUMN checksum_type TEXT DEFAULT '';
ALTER TABLE projects ADD COLUMN share_token TEXT;
