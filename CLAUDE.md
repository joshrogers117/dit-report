# DIT Report Manager — Developer Notes

## Environments

- **Production:** `dit.traderjosh.com` (main branch)
- **Dev:** `dit.dev.traderjosh.com` (dev branch)

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

## Authentication

- **Clerk** handles authentication (JWT-based)
- Clerk publishable keys and FAPI URLs are selected dynamically in `app.html` and `login.html` based on `location.hostname`
- API middleware (`functions/api/_middleware.js`) validates Bearer tokens via `verifyToken` with `CLERK_JWT_KEY`
- Public (unauthenticated) API paths: `/api/health`, `/api/status`, `/api/webhooks/clerk`
- Admin user ID is defined in `lib/auth-constants.js`; admins can impersonate users via `x-impersonate-user` header
- New users are auto-provisioned in the DB on first request and seeded with a demo project (`lib/demo-project.js`)

## Project Structure

- `public/app.html` — Single-file app dashboard (HTML + CSS + JS)
- `public/login.html` — Clerk sign-in page
- `public/404.html` — Custom 404 error page
- `public/_redirects` — Cloudflare Pages routing rules
- `public/icons/cameras/` — Monochrome brand SVGs (currentColor) for 8 camera manufacturers
- `functions/api/_middleware.js` — Auth middleware (Clerk JWT verification, user provisioning)
- `functions/api/[[path]].js` — Cloudflare Pages Functions API (itty-router, D1 database)
- `lib/report-renderer.js` — Server-side HTML/PDF report generation (inline brand SVGs, theme support)
- `lib/calculations.js` — Shared calculation utilities (day/project/cumulative totals)
- `lib/timecode.js` — Timecode math utilities (parse, add, sum HH:MM:SS:FF)
- `lib/db-helpers.js` — Shared DB queries (getFullProject)
- `lib/demo-project.js` — Demo project seeder for new users
- `lib/auth-constants.js` — Admin user ID constant
- `schema.sql` — Database schema reference
- `migrations/` — D1 migration files

## Security Notes

- The repo is **public**. Never commit real personal data, API keys, or secrets.
- Git history was scrubbed (2026-03-22) to remove files that contained real names and contact info (`index.html`, `seed.js`, `seed.sql`).
- All API routes require authentication except the public paths listed above. Every data query filters by `user_id` with ownership verification.
- `public/_redirects` sends `/app/*` to login to prevent stale Cloudflare Pages assets from being served at unexpected paths.
