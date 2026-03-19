# DIT Report Manager — Developer Notes

## Branch & Database Isolation

dev and main use **separate D1 databases** via different `database_id` values in `wrangler.toml`:
- **main (production):** `2aa70294-3246-41fa-ae04-c396cdbc1335`
- **dev:** `0e416d48-c80a-4932-a7ce-1d602cac5bbb`

### Required Setup (every machine / fresh clone)

Run this after cloning to enable the merge driver that prevents `wrangler.toml` from being overwritten during merges:

```sh
git config merge.ours.driver true
```

Without this, the `.gitattributes` rule (`wrangler.toml merge=ours`) is silently ignored and the wrong database ID will leak across branches.

### After merging dev → main

Always verify `wrangler.toml` has the correct production database ID before pushing:

```sh
grep database_id wrangler.toml
# Should show: 2aa70294-3246-41fa-ae04-c396cdbc1335 on main
```

## Project Structure

- `public/admin.html` — Single-file admin dashboard (HTML + CSS + JS)
- `functions/api/[[path]].js` — Cloudflare Pages Functions API (D1 database)
- `lib/report-renderer.js` — Server-side HTML/PDF report generation
- `lib/calculations.js` — Shared calculation utilities
- `lib/timecode.js` — Timecode math utilities
- `schema.sql` — Database schema reference
- `public/icons/cameras/` — Monochrome brand SVGs (currentColor) for 8 camera manufacturers
