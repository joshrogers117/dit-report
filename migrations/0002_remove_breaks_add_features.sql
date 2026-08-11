-- Remove break rows and the is_break/frames columns.
-- NOTE: the companion columns for this release (rolls.camera_id,
-- projects.checksum_type, projects.share_token) are added by the API's
-- boot-time ensureDB() fallbacks, which always run before this migration
-- (deploying the code precedes applying migrations). SQLite has no
-- ADD COLUMN IF NOT EXISTS, so this file handles only the removals.
DELETE FROM rolls WHERE is_break = 1;
ALTER TABLE rolls DROP COLUMN is_break;
ALTER TABLE rolls DROP COLUMN frames;
