# DIT Report Manager

Offload logs, drive benchmarks, and shoot-day reports in one place. A working tool for DITs and data managers on film, television, and commercial sets: log card offloads at the cart, send production the report before wrap.

Live at [dit.ridgestudios.com](https://dit.ridgestudios.com).

## What it does

- **Offload logging** — per-day roll tables with card serials, sizes, timecode math (HH:MM:SS:FF), master/backup verification, and roll-to-source linkage. Enter on the last row keeps you typing; roll names auto-increment (A002 → A003).
- **CSV import** — paste or drop an offload report. Per-clip reports (ShotPut Studio and similar) are summarized into one roll per card, with sizes, durations, and verification derived from each clip's copies. Generic CSVs get header auto-mapping with a preview before anything is written.
- **Drive benchmarks** — write and read speeds per drive, with relative bars in the report.
- **Media sources** — video, audio, and photo sources with brand detection for 8 camera manufacturers and per-brand placeholder hints for resolution, codec, colorspace, and LUT.
- **Reports** — interactive HTML with light and dark themes and per-source subtotals, plus a single-page PDF. When a checksum method is set (xxHash64, MD5, SHA-256, …), the report carries a verification line.
- **Share links** — tokened read-only URLs for producers and post. Create, copy, and revoke from the project page; exports also work as plain files.
- **Built for set life** — offline-tolerant auto-save with retry and a sync indicator, undo on deletes, dark theme for the video village, drag-to-reorder, and TB units once a project earns them.

## Stack

Single-file vanilla JS frontend (no build step) on Cloudflare Pages. Pages Functions API (itty-router) with a D1 database. Clerk for authentication. PDFs rendered via Cloudflare Browser Rendering. Exported reports are fully self-contained HTML — inline CSS, inline brand SVGs, no external dependencies beyond webfonts.

## Development

```sh
git clone https://github.com/joshrogers117/dit-report
cd dit-report
npx wrangler pages dev
```

The API needs a D1 binding (configured in `wrangler.toml`) and a `CLERK_JWT_KEY` in `.dev.vars`. Environments, branch and database isolation, and migration conventions are documented in [CLAUDE.md](CLAUDE.md).

Created by [Ridge Studios](https://ridgestudios.com).
