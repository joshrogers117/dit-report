import { AutoRouter, error, json } from 'itty-router';
import puppeteer from '@cloudflare/puppeteer';
import { computeDayTotals, computeProjectTotals, computeCumulativeTotals } from '../../lib/calculations.js';
import { renderStandaloneHTML, renderPrintHTML } from '../../lib/report-renderer.js';
import { getFullProject } from '../../lib/db-helpers.js';

// ===== AUTO-INIT: schema + sample data on first request =====

let dbInitialized = false;

async function ensureDB(db) {
  if (dbInitialized) return;
  dbInitialized = true;

  // Create tables
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS projects (
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
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS shoot_days (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      day_number INTEGER NOT NULL,
      date TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS benchmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day_id INTEGER NOT NULL REFERENCES shoot_days(id) ON DELETE CASCADE,
      drive_name TEXT NOT NULL DEFAULT '',
      write_speed REAL DEFAULT 0,
      read_speed REAL DEFAULT 0,
      capacity TEXT DEFAULT '',
      format TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS cameras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day_id INTEGER NOT NULL REFERENCES shoot_days(id) ON DELETE CASCADE,
      source_type TEXT DEFAULT 'camera',
      camera_name TEXT NOT NULL DEFAULT '',
      resolution TEXT DEFAULT '',
      codec TEXT DEFAULT '',
      colorspace TEXT DEFAULT '',
      lut TEXT DEFAULT '',
      fps TEXT DEFAULT '23.976',
      audio TEXT DEFAULT '',
      label TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS rolls (
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
    )`),
  ]);

  // Migrations: add columns that may not exist in older databases
  try { await db.prepare('ALTER TABLE cameras ADD COLUMN audio TEXT DEFAULT \'\'').run(); } catch(e) { /* column already exists */ }
  try { await db.prepare('ALTER TABLE cameras ADD COLUMN source_type TEXT DEFAULT \'camera\'').run(); } catch(e) { /* column already exists */ }

  // Seed sample data if database is empty
  const { count } = await db.prepare('SELECT COUNT(*) as count FROM projects').first();
  if (count > 0) return;

  await db.prepare(`INSERT INTO projects (id, title, production_company, client, director, producer, dp, first_ac, dit_name, dit_email, dit_phone)
    VALUES (1, 'Winter 2026 Tech Release', 'Ridge Studios', 'Flexport', 'John David Wright', 'Josh Ferrara', 'Cole Sullivan', 'Andrew Friedrichs', 'Josh Rogers', 'dit@example.com', '+1 (555) 000-0000')`).run();

  // Day 1
  await db.prepare(`INSERT INTO shoot_days (id, project_id, day_number, date, sort_order) VALUES (1, 1, 1, '2024-11-13', 1)`).run();
  await db.batch([
    db.prepare(`INSERT INTO benchmarks (day_id, drive_name, write_speed, read_speed, capacity, format, notes, sort_order) VALUES (1, 'Echo_01', 879.8, 671.0, '4TB', 'APFS', 'SanDisk Extreme 55AE', 1)`),
    db.prepare(`INSERT INTO benchmarks (day_id, drive_name, write_speed, read_speed, capacity, format, notes, sort_order) VALUES (1, 'Echo_02', 878.7, 668.8, '4TB', 'APFS', 'SanDisk Extreme 55AE', 2)`),
    db.prepare(`INSERT INTO cameras (day_id, camera_name, resolution, codec, colorspace, lut, fps, label, notes, sort_order) VALUES (1, 'V-RAPTOR XL', '8K 17:9', 'R3D MQ', 'LOG3G10', 'REC709', '23.976', 'ACAM', '', 1)`),
    db.prepare(`INSERT INTO cameras (day_id, camera_name, resolution, codec, colorspace, lut, fps, label, notes, sort_order) VALUES (1, 'KOMODO X', '6K 17:9', 'R3D MQ', 'LOG3G10', 'REC709', '23.976', 'BCAM', '', 2)`),
    db.prepare(`INSERT INTO cameras (day_id, camera_name, resolution, codec, colorspace, lut, fps, label, notes, sort_order) VALUES (1, 'ALEXA 35', '4.6K 3:2', 'ARRIRAW HDE', 'LogC4', 'ALF-4 Rec709', '23.976', 'CCAM', '', 3)`),
    db.prepare(`INSERT INTO rolls (day_id, roll_name, is_break, card_serial, gb, duration_tc, frames, master, backup, notes, sort_order) VALUES (1, 'B001_1113PV', 0, 'AOGPAWF', 267.75, '00:26:35:14', 38294, 1, 1, '', 1)`),
    db.prepare(`INSERT INTO rolls (day_id, roll_name, is_break, card_serial, gb, duration_tc, frames, master, backup, notes, sort_order) VALUES (1, 'C001_1113RK', 0, 'CDX-38147', 42.61, '00:03:23:01', 4873, 1, 1, 'Codex Compact Drive', 2)`),
    db.prepare(`INSERT INTO rolls (day_id, roll_name, is_break, card_serial, gb, duration_tc, frames, master, backup, notes, sort_order) VALUES (1, 'A001_11121K', 0, 'ARB4BYL', 1004.87, '00:56:17:00', 81048, 1, 1, '', 3)`),
  ]);

  // Day 2
  await db.prepare(`INSERT INTO shoot_days (id, project_id, day_number, date, sort_order) VALUES (2, 1, 2, '2024-11-14', 2)`).run();
  await db.batch([
    db.prepare(`INSERT INTO benchmarks (day_id, drive_name, write_speed, read_speed, capacity, format, notes, sort_order) VALUES (2, 'Echo_01', 879.8, 671.0, '4TB', 'APFS', 'SanDisk Extreme 55AE', 1)`),
    db.prepare(`INSERT INTO benchmarks (day_id, drive_name, write_speed, read_speed, capacity, format, notes, sort_order) VALUES (2, 'Echo_02', 878.7, 668.8, '4TB', 'APFS', 'SanDisk Extreme 55AE', 2)`),
    db.prepare(`INSERT INTO cameras (day_id, camera_name, resolution, codec, colorspace, lut, fps, label, notes, sort_order) VALUES (2, 'V-RAPTOR XL', '8K 17:9', 'R3D MQ', 'LOG3G10', 'REC709', '23.976', 'ACAM', '', 1)`),
    db.prepare(`INSERT INTO cameras (day_id, camera_name, resolution, codec, colorspace, lut, fps, label, notes, sort_order) VALUES (2, 'KOMODO X', '6K 17:9', 'R3D MQ', 'LOG3G10', 'REC709', '23.976', 'BCAM', '', 2)`),
    db.prepare(`INSERT INTO cameras (day_id, camera_name, resolution, codec, colorspace, lut, fps, label, notes, sort_order) VALUES (2, 'ALEXA 35', '4.6K 3:2', 'ARRIRAW HDE', 'LogC4', 'ALF-4 Rec709', '23.976', 'CCAM', '', 3)`),
    db.prepare(`INSERT INTO rolls (day_id, roll_name, is_break, card_serial, gb, duration_tc, frames, master, backup, notes, sort_order) VALUES (2, 'A002_1114F4', 0, 'AR2JAQY', 613.14, '00:34:20:10', 49450, 1, 1, '478 MB/s READ', 1)`),
    db.prepare(`INSERT INTO rolls (day_id, roll_name, is_break, card_serial, gb, duration_tc, frames, master, backup, notes, sort_order) VALUES (2, 'B002_1114N0', 0, 'AU4YPWD', 305.65, '00:30:22:21', 43749, 1, 1, '474 MB/s READ', 2)`),
    db.prepare(`INSERT INTO rolls (day_id, roll_name, is_break, card_serial, gb, duration_tc, frames, master, backup, notes, sort_order) VALUES (2, 'A003_1114MX', 0, 'AW6PKEB', 542.77, '00:30:23:22', 43774, 1, 1, '477 MB/s READ', 3)`),
    db.prepare(`INSERT INTO rolls (day_id, roll_name, is_break, card_serial, gb, duration_tc, frames, master, backup, notes, sort_order) VALUES (2, 'LUNCH', 1, '', 0, '00:00:00:00', 0, 0, 0, '', 4)`),
    db.prepare(`INSERT INTO rolls (day_id, roll_name, is_break, card_serial, gb, duration_tc, frames, master, backup, notes, sort_order) VALUES (2, 'A004_1114WR', 0, 'AWIGXJC', 313.53, '00:17:33:15', 25287, 1, 1, '475 MB/s READ', 5)`),
    db.prepare(`INSERT INTO rolls (day_id, roll_name, is_break, card_serial, gb, duration_tc, frames, master, backup, notes, sort_order) VALUES (2, 'A005_1114XR', 0, 'ARB4BYL', 163.03, '00:09:07:20', 13148, 1, 1, '470 MB/s READ', 6)`),
    db.prepare(`INSERT INTO rolls (day_id, roll_name, is_break, card_serial, gb, duration_tc, frames, master, backup, notes, sort_order) VALUES (2, 'A006_1114SC', 0, 'AR2JAQY', 69.32, '00:03:52:22', 5590, 1, 1, '473 MB/s READ', 7)`),
    db.prepare(`INSERT INTO rolls (day_id, roll_name, is_break, card_serial, gb, duration_tc, frames, master, backup, notes, sort_order) VALUES (2, 'C002_1114FY', 0, 'CDX-38291', 18.44, '00:01:28:06', 2118, 1, 1, 'Codex Compact Drive', 8)`),
  ]);

  // Day 3
  await db.prepare(`INSERT INTO shoot_days (id, project_id, day_number, date, sort_order) VALUES (3, 1, 3, '2024-11-15', 3)`).run();
  await db.batch([
    db.prepare(`INSERT INTO benchmarks (day_id, drive_name, write_speed, read_speed, capacity, format, notes, sort_order) VALUES (3, 'Frank_01', 2668.9, 2669.2, '4TB', 'APFS', 'PCIe SSD Media - Glyph', 1)`),
    db.prepare(`INSERT INTO benchmarks (day_id, drive_name, write_speed, read_speed, capacity, format, notes, sort_order) VALUES (3, 'Frank_02', 2639.6, 2674.2, '4TB', 'APFS', 'PCIe SSD Media - Glyph', 2)`),
    db.prepare(`INSERT INTO cameras (day_id, camera_name, resolution, codec, colorspace, lut, fps, label, notes, sort_order) VALUES (3, 'V-RAPTOR XL', '8K 17:9', 'R3D MQ', 'LOG3G10', 'REC709', '23.976', 'ACAM', '', 1)`),
    db.prepare(`INSERT INTO cameras (day_id, camera_name, resolution, codec, colorspace, lut, fps, label, notes, sort_order) VALUES (3, 'KOMODO X', '6K 17:9', 'R3D MQ', 'LOG3G10', 'REC709', '23.976', 'BCAM', '', 2)`),
    db.prepare(`INSERT INTO cameras (day_id, camera_name, resolution, codec, colorspace, lut, fps, label, notes, sort_order) VALUES (3, 'ALEXA 35', '4.6K 3:2', 'ARRIRAW HDE', 'LogC4', 'ALF-4 Rec709', '23.976', 'CCAM', '', 3)`),
    db.prepare(`INSERT INTO rolls (day_id, roll_name, is_break, card_serial, gb, duration_tc, frames, master, backup, notes, sort_order) VALUES (3, 'C003_1115SJ', 0, 'CDX-38503', 35.82, '00:02:51:10', 4114, 1, 1, 'Codex Compact Drive', 1)`),
    db.prepare(`INSERT INTO rolls (day_id, roll_name, is_break, card_serial, gb, duration_tc, frames, master, backup, notes, sort_order) VALUES (3, 'A007_1115XD', 0, 'AW6PKEB', 226.4, '00:12:40:20', 18260, 1, 1, '683 MB/s READ burst, then slows down to 370 MB/s', 2)`),
    db.prepare(`INSERT INTO rolls (day_id, roll_name, is_break, card_serial, gb, duration_tc, frames, master, backup, notes, sort_order) VALUES (3, 'B003_1115TZ', 0, 'APLCHRY', 178.68, '00:17:45:18', 25578, 1, 1, '', 3)`),
    db.prepare(`INSERT INTO rolls (day_id, roll_name, is_break, card_serial, gb, duration_tc, frames, master, backup, notes, sort_order) VALUES (3, 'A008_1115EP', 0, 'AWIGXJC', 267.46, '00:14:58:19', 21571, 1, 1, '', 4)`),
    db.prepare(`INSERT INTO rolls (day_id, roll_name, is_break, card_serial, gb, duration_tc, frames, master, backup, notes, sort_order) VALUES (3, 'LUNCH', 1, '', 0, '00:00:00:00', 0, 0, 0, '', 5)`),
    db.prepare(`INSERT INTO rolls (day_id, roll_name, is_break, card_serial, gb, duration_tc, frames, master, backup, notes, sort_order) VALUES (3, 'A009_1115W8', 0, 'ARB4BYL', 531.7, '00:29:46:18', 42882, 1, 1, '', 6)`),
    db.prepare(`INSERT INTO rolls (day_id, roll_name, is_break, card_serial, gb, duration_tc, frames, master, backup, notes, sort_order) VALUES (3, 'A010_1115LD', 0, 'AR2JAQY', 20.74, '00:01:09:16', 1672, 1, 1, 'Final portrait', 7)`),
    db.prepare(`INSERT INTO rolls (day_id, roll_name, is_break, card_serial, gb, duration_tc, frames, master, backup, notes, sort_order) VALUES (3, 'B004_1115MP', 0, 'AOGPAWF', 177.6, '00:17:38:16', 25408, 1, 1, '', 8)`),
  ]);
}

const router = AutoRouter({ base: '/api' });

// ===== PROJECTS =====

// List all projects
router.get('/projects', async (request, env) => {
  const { results: projects } = await env.DB.prepare('SELECT * FROM projects ORDER BY updated_at DESC').all();

  const result = await Promise.all(projects.map(async p => {
    const { results: days } = await env.DB.prepare(
      'SELECT * FROM shoot_days WHERE project_id = ? ORDER BY sort_order, day_number'
    ).bind(p.id).all();

    const dayTotals = await Promise.all(days.map(async d => {
      const { results: rolls } = await env.DB.prepare(
        'SELECT * FROM rolls WHERE day_id = ? ORDER BY sort_order'
      ).bind(d.id).all();
      return computeDayTotals(rolls);
    }));

    const totals = computeProjectTotals(dayTotals);
    return { ...p, dayCount: days.length, totals };
  }));

  return Response.json(result);
});

// Create project
router.post('/projects', async (request, env) => {
  const body = await request.json();
  const { title, production_company, client, director, producer, dp, first_ac, dit_name, dit_email, dit_phone } = body;
  const result = await env.DB.prepare(`
    INSERT INTO projects (title, production_company, client, director, producer, dp, first_ac, dit_name, dit_email, dit_phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    title || 'Untitled Project', production_company || '', client || '', director || '',
    producer || '', dp || '', first_ac || '', dit_name || '', dit_email || '', dit_phone || ''
  ).run();
  return Response.json({ id: result.meta.last_row_id });
});

// Get full project
router.get('/projects/:id', async (request, env) => {
  const project = await getFullProject(env.DB, request.params.id);
  if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });
  return Response.json(project);
});

// Update project
router.put('/projects/:id', async (request, env) => {
  const body = await request.json();
  const fields = ['title', 'production_company', 'client', 'director', 'producer', 'dp', 'first_ac', 'dit_name', 'dit_email', 'dit_phone', 'archived'];
  const updates = [];
  const values = [];
  for (const f of fields) {
    if (body[f] !== undefined) {
      updates.push(`${f} = ?`);
      values.push(body[f]);
    }
  }
  if (updates.length === 0) return Response.json({ ok: true });
  updates.push("updated_at = datetime('now')");
  values.push(request.params.id);
  await env.DB.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();
  return Response.json({ ok: true });
});

// Delete project
router.delete('/projects/:id', async (request, env) => {
  await env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(request.params.id).run();
  return Response.json({ ok: true });
});

// ===== DAYS =====

// Create day
router.post('/projects/:pid/days', async (request, env) => {
  const pid = request.params.pid;
  const body = await request.json();
  const maxOrder = await env.DB.prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM shoot_days WHERE project_id = ?').bind(pid).first();
  const maxDay = await env.DB.prepare('SELECT COALESCE(MAX(day_number), 0) as m FROM shoot_days WHERE project_id = ?').bind(pid).first();
  const result = await env.DB.prepare(
    'INSERT INTO shoot_days (project_id, day_number, date, sort_order) VALUES (?, ?, ?, ?)'
  ).bind(pid, body.day_number || maxDay.m + 1, body.date || new Date().toISOString().slice(0, 10), maxOrder.m + 1).run();
  await env.DB.prepare("UPDATE projects SET updated_at = datetime('now') WHERE id = ?").bind(pid).run();
  return Response.json({ id: result.meta.last_row_id });
});

// Get single day
router.get('/days/:id', async (request, env) => {
  const day = await env.DB.prepare('SELECT * FROM shoot_days WHERE id = ?').bind(request.params.id).first();
  if (!day) return Response.json({ error: 'Day not found' }, { status: 404 });
  const [benchRes, camRes, rollRes] = await Promise.all([
    env.DB.prepare('SELECT * FROM benchmarks WHERE day_id = ? ORDER BY sort_order').bind(day.id).all(),
    env.DB.prepare('SELECT * FROM cameras WHERE day_id = ? ORDER BY sort_order').bind(day.id).all(),
    env.DB.prepare('SELECT * FROM rolls WHERE day_id = ? ORDER BY sort_order').bind(day.id).all(),
  ]);
  return Response.json({ ...day, benchmarks: benchRes.results, cameras: camRes.results, rolls: rollRes.results });
});

// Update day
router.put('/days/:id', async (request, env) => {
  const body = await request.json();
  const stmts = [];
  if (body.date !== undefined) stmts.push(env.DB.prepare('UPDATE shoot_days SET date = ? WHERE id = ?').bind(body.date, request.params.id));
  if (body.day_number !== undefined) stmts.push(env.DB.prepare('UPDATE shoot_days SET day_number = ? WHERE id = ?').bind(body.day_number, request.params.id));
  if (stmts.length > 0) await env.DB.batch(stmts);
  return Response.json({ ok: true });
});

// Delete day
router.delete('/days/:id', async (request, env) => {
  await env.DB.prepare('DELETE FROM shoot_days WHERE id = ?').bind(request.params.id).run();
  return Response.json({ ok: true });
});

// Clone day
router.post('/days/:id/clone', async (request, env) => {
  const src = await env.DB.prepare('SELECT * FROM shoot_days WHERE id = ?').bind(request.params.id).first();
  if (!src) return Response.json({ error: 'Day not found' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const maxOrder = await env.DB.prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM shoot_days WHERE project_id = ?').bind(src.project_id).first();
  const maxDay = await env.DB.prepare('SELECT COALESCE(MAX(day_number), 0) as m FROM shoot_days WHERE project_id = ?').bind(src.project_id).first();

  const newDate = body.date || new Date().toISOString().slice(0, 10);
  const dayResult = await env.DB.prepare(
    'INSERT INTO shoot_days (project_id, day_number, date, sort_order) VALUES (?, ?, ?, ?)'
  ).bind(src.project_id, maxDay.m + 1, newDate, maxOrder.m + 1).run();
  const newDayId = dayResult.meta.last_row_id;

  // Clone benchmarks + cameras in one batch
  const [benchRes, camRes] = await Promise.all([
    env.DB.prepare('SELECT * FROM benchmarks WHERE day_id = ?').bind(src.id).all(),
    env.DB.prepare('SELECT * FROM cameras WHERE day_id = ?').bind(src.id).all(),
  ]);

  const cloneStmts = [
    ...benchRes.results.map(b =>
      env.DB.prepare('INSERT INTO benchmarks (day_id, drive_name, write_speed, read_speed, capacity, format, notes, sort_order) VALUES (?,?,?,?,?,?,?,?)')
        .bind(newDayId, b.drive_name, b.write_speed, b.read_speed, b.capacity, b.format, b.notes, b.sort_order)
    ),
    ...camRes.results.map(c =>
      env.DB.prepare('INSERT INTO cameras (day_id, source_type, camera_name, resolution, codec, colorspace, lut, fps, audio, label, notes, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
        .bind(newDayId, c.source_type || 'camera', c.camera_name, c.resolution, c.codec, c.colorspace, c.lut, c.fps, c.audio || '', c.label, c.notes, c.sort_order)
    ),
  ];
  if (cloneStmts.length > 0) await env.DB.batch(cloneStmts);

  return Response.json({ id: newDayId });
});

// ===== BENCHMARKS =====

router.post('/days/:did/benchmarks', async (request, env) => {
  const did = request.params.did;
  const body = await request.json();
  const maxOrder = await env.DB.prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM benchmarks WHERE day_id = ?').bind(did).first();
  const result = await env.DB.prepare(
    'INSERT INTO benchmarks (day_id, drive_name, write_speed, read_speed, capacity, format, notes, sort_order) VALUES (?,?,?,?,?,?,?,?)'
  ).bind(did, body.drive_name || '', body.write_speed || 0, body.read_speed || 0, body.capacity || '', body.format || '', body.notes || '', maxOrder.m + 1).run();
  return Response.json({ id: result.meta.last_row_id });
});

router.put('/benchmarks/:id', async (request, env) => {
  const body = await request.json();
  const fields = ['drive_name', 'write_speed', 'read_speed', 'capacity', 'format', 'notes', 'sort_order'];
  const updates = [];
  const values = [];
  for (const f of fields) {
    if (body[f] !== undefined) { updates.push(`${f} = ?`); values.push(body[f]); }
  }
  if (updates.length === 0) return Response.json({ ok: true });
  values.push(request.params.id);
  await env.DB.prepare(`UPDATE benchmarks SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();
  return Response.json({ ok: true });
});

router.delete('/benchmarks/:id', async (request, env) => {
  await env.DB.prepare('DELETE FROM benchmarks WHERE id = ?').bind(request.params.id).run();
  return Response.json({ ok: true });
});

// ===== CAMERAS =====

router.post('/days/:did/cameras', async (request, env) => {
  const did = request.params.did;
  const body = await request.json();
  const maxOrder = await env.DB.prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM cameras WHERE day_id = ?').bind(did).first();
  const result = await env.DB.prepare(
    'INSERT INTO cameras (day_id, source_type, camera_name, resolution, codec, colorspace, lut, fps, audio, label, notes, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
  ).bind(did, body.source_type || 'camera', body.camera_name || '', body.resolution || '', body.codec || '', body.colorspace || '', body.lut || '', body.fps || '23.976', body.audio || '', body.label || '', body.notes || '', maxOrder.m + 1).run();
  return Response.json({ id: result.meta.last_row_id });
});

router.put('/cameras/:id', async (request, env) => {
  const body = await request.json();
  const fields = ['source_type', 'camera_name', 'resolution', 'codec', 'colorspace', 'lut', 'fps', 'audio', 'label', 'notes', 'sort_order'];
  const updates = [];
  const values = [];
  for (const f of fields) {
    if (body[f] !== undefined) { updates.push(`${f} = ?`); values.push(body[f]); }
  }
  if (updates.length === 0) return Response.json({ ok: true });
  values.push(request.params.id);
  await env.DB.prepare(`UPDATE cameras SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();
  return Response.json({ ok: true });
});

router.post('/cameras/:id/duplicate', async (request, env) => {
  const src = await env.DB.prepare('SELECT * FROM cameras WHERE id = ?').bind(request.params.id).first();
  if (!src) return Response.json({ error: 'Not found' }, { status: 404 });
  const maxOrder = await env.DB.prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM cameras WHERE day_id = ?').bind(src.day_id).first();
  const result = await env.DB.prepare(
    'INSERT INTO cameras (day_id, source_type, camera_name, resolution, codec, colorspace, lut, fps, audio, label, notes, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
  ).bind(src.day_id, src.source_type || 'camera', src.camera_name, src.resolution, src.codec, src.colorspace, src.lut, src.fps, src.audio || '', src.label, src.notes, maxOrder.m + 1).run();
  return Response.json({ id: result.meta.last_row_id });
});

router.delete('/cameras/:id', async (request, env) => {
  await env.DB.prepare('DELETE FROM cameras WHERE id = ?').bind(request.params.id).run();
  return Response.json({ ok: true });
});

// ===== ROLLS =====

router.post('/days/:did/rolls', async (request, env) => {
  const did = request.params.did;
  const body = await request.json();
  const maxOrder = await env.DB.prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM rolls WHERE day_id = ?').bind(did).first();
  const result = await env.DB.prepare(
    'INSERT INTO rolls (day_id, roll_name, is_break, card_serial, gb, duration_tc, frames, master, backup, notes, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
  ).bind(did, body.roll_name || '', body.is_break ? 1 : 0, body.card_serial || '', body.gb || 0, body.duration_tc || '00:00:00:00', body.frames || 0, body.master ? 1 : 0, body.backup ? 1 : 0, body.notes || '', maxOrder.m + 1).run();
  return Response.json({ id: result.meta.last_row_id });
});

router.put('/rolls/:id', async (request, env) => {
  const body = await request.json();
  const fields = ['roll_name', 'is_break', 'card_serial', 'gb', 'duration_tc', 'frames', 'master', 'backup', 'notes', 'sort_order'];
  const updates = [];
  const values = [];
  for (const f of fields) {
    if (body[f] !== undefined) {
      updates.push(`${f} = ?`);
      values.push(f === 'is_break' || f === 'master' || f === 'backup' ? (body[f] ? 1 : 0) : body[f]);
    }
  }
  if (updates.length === 0) return Response.json({ ok: true });
  values.push(request.params.id);
  await env.DB.prepare(`UPDATE rolls SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();
  return Response.json({ ok: true });
});

router.delete('/rolls/:id', async (request, env) => {
  await env.DB.prepare('DELETE FROM rolls WHERE id = ?').bind(request.params.id).run();
  return Response.json({ ok: true });
});

// Reorder rolls
router.put('/days/:did/rolls/reorder', async (request, env) => {
  const body = await request.json();
  const { order } = body;
  if (!Array.isArray(order)) return Response.json({ error: 'order must be an array' }, { status: 400 });
  const did = request.params.did;
  const stmts = order.map((id, idx) =>
    env.DB.prepare('UPDATE rolls SET sort_order = ? WHERE id = ? AND day_id = ?').bind(idx, id, did)
  );
  if (stmts.length > 0) await env.DB.batch(stmts);
  return Response.json({ ok: true });
});

// ===== EXPORT =====

// HTML export
router.get('/projects/:id/export/html', async (request, env) => {
  const project = await getFullProject(env.DB, request.params.id);
  if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });
  const html = renderStandaloneHTML(project);
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
      'Content-Disposition': `attachment; filename="${project.title} - DIT Report.html"`,
    }
  });
});

// PDF export via Browser Rendering
router.get('/projects/:id/export/pdf', async (request, env) => {
  const project = await getFullProject(env.DB, request.params.id);
  if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });
  const html = renderPrintHTML(project);

  let browser;
  try {
    browser = await puppeteer.launch(env.BROWSER);
    const page = await browser.newPage();
    await page.setViewport({ width: 1122, height: 800 }); // A4 landscape width at 96dpi
    await page.setContent(html, { waitUntil: 'load' });
    // Measure actual content height for a single continuous page
    const contentHeight = await page.evaluate(() => document.body.scrollHeight);
    const pdf = await page.pdf({
      width: '11.69in',
      height: (contentHeight / 96 + 1) + 'in', // convert px to inches + padding
      printBackground: true,
      margin: { top: '0.4in', bottom: '0.4in', left: '0.5in', right: '0.5in' }
    });
    await browser.close();

    return new Response(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${project.title} - DIT Report.pdf"`,
      }
    });
  } catch (err) {
    if (browser) await browser.close();
    return Response.json({ error: 'PDF generation failed: ' + err.message }, { status: 500 });
  }
});

// Pages Function entry point
export async function onRequest(context) {
  await ensureDB(context.env.DB);
  return router.fetch(context.request, context.env);
}
