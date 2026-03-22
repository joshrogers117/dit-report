import { AutoRouter, error, json } from 'itty-router';
import puppeteer from '@cloudflare/puppeteer';
import { computeDayTotals, computeProjectTotals, computeCumulativeTotals } from '../../lib/calculations.js';
import { renderStandaloneHTML, renderPrintHTML } from '../../lib/report-renderer.js';
import { getFullProject } from '../../lib/db-helpers.js';
import { verifyWebhook } from '@clerk/backend/webhooks';
import { seedDemoProject } from '../../lib/demo-project.js';

// ===== Ownership verification helpers =====

async function verifyProjectOwnership(db, projectId, userId) {
  return db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').bind(projectId, userId).first();
}

async function verifyDayOwnership(db, dayId, userId) {
  return db.prepare(
    `SELECT sd.* FROM shoot_days sd
     JOIN projects p ON sd.project_id = p.id
     WHERE sd.id = ? AND p.user_id = ?`
  ).bind(dayId, userId).first();
}

async function verifyItemOwnership(db, table, itemId, userId) {
  const allowed = ['benchmarks', 'cameras', 'rolls'];
  if (!allowed.includes(table)) return null;
  return db.prepare(
    `SELECT t.* FROM ${table} t
     JOIN shoot_days sd ON t.day_id = sd.id
     JOIN projects p ON sd.project_id = p.id
     WHERE t.id = ? AND p.user_id = ?`
  ).bind(itemId, userId).first();
}

// ===== AUTO-INIT: schema on first request =====

let dbInitialized = false;

async function ensureDB(db) {
  if (dbInitialized) return;
  dbInitialized = true;

  // Create tables
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL DEFAULT '',
      company TEXT DEFAULT '',
      subscription_status TEXT DEFAULT 'free',
      stripe_customer_id TEXT DEFAULT NULL,
      stripe_subscription_id TEXT DEFAULT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL DEFAULT '',
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
      gamma TEXT DEFAULT '',
      lut TEXT DEFAULT '',
      fps TEXT DEFAULT '',
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
  try { await db.prepare('ALTER TABLE cameras ADD COLUMN gamma TEXT DEFAULT \'\'').run(); } catch(e) { /* column already exists */ }
  try { await db.prepare('ALTER TABLE projects ADD COLUMN user_id TEXT NOT NULL DEFAULT \'\'').run(); } catch(e) { /* column already exists */ }

  // Index for user_id lookups
  try { await db.prepare('CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id)').run(); } catch(e) { /* already exists */ }
}

const router = AutoRouter({ base: '/api' });

// ===== PROJECTS =====

// List all projects
router.get('/projects', async (request, env) => {
  const userId = request.userId;
  const { results: projects } = await env.DB.prepare(
    'SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC'
  ).bind(userId).all();

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
  const userId = request.userId;
  const body = await request.json();
  const { title, production_company, client, director, producer, dp, first_ac, dit_name, dit_email, dit_phone } = body;
  const result = await env.DB.prepare(`
    INSERT INTO projects (user_id, title, production_company, client, director, producer, dp, first_ac, dit_name, dit_email, dit_phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    userId, title || 'Untitled Project', production_company || '', client || '', director || '',
    producer || '', dp || '', first_ac || '', dit_name || '', dit_email || '', dit_phone || ''
  ).run();
  return Response.json({ id: result.meta.last_row_id });
});

// Get full project
router.get('/projects/:id', async (request, env) => {
  const project = await getFullProject(env.DB, request.params.id, request.userId);
  if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });
  return Response.json(project);
});

// Update project
router.put('/projects/:id', async (request, env) => {
  const owned = await verifyProjectOwnership(env.DB, request.params.id, request.userId);
  if (!owned) return Response.json({ error: 'Project not found' }, { status: 404 });

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
  const owned = await verifyProjectOwnership(env.DB, request.params.id, request.userId);
  if (!owned) return Response.json({ error: 'Project not found' }, { status: 404 });
  await env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(request.params.id).run();
  return Response.json({ ok: true });
});

// ===== DAYS =====

// Create day
router.post('/projects/:pid/days', async (request, env) => {
  const pid = request.params.pid;
  const owned = await verifyProjectOwnership(env.DB, pid, request.userId);
  if (!owned) return Response.json({ error: 'Project not found' }, { status: 404 });

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
  const day = await verifyDayOwnership(env.DB, request.params.id, request.userId);
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
  const day = await verifyDayOwnership(env.DB, request.params.id, request.userId);
  if (!day) return Response.json({ error: 'Day not found' }, { status: 404 });

  const body = await request.json();
  const stmts = [];
  if (body.date !== undefined) stmts.push(env.DB.prepare('UPDATE shoot_days SET date = ? WHERE id = ?').bind(body.date, request.params.id));
  if (body.day_number !== undefined) stmts.push(env.DB.prepare('UPDATE shoot_days SET day_number = ? WHERE id = ?').bind(body.day_number, request.params.id));
  if (stmts.length > 0) await env.DB.batch(stmts);
  return Response.json({ ok: true });
});

// Delete day
router.delete('/days/:id', async (request, env) => {
  const day = await verifyDayOwnership(env.DB, request.params.id, request.userId);
  if (!day) return Response.json({ error: 'Day not found' }, { status: 404 });
  await env.DB.prepare('DELETE FROM shoot_days WHERE id = ?').bind(request.params.id).run();
  return Response.json({ ok: true });
});

// Clone day
router.post('/days/:id/clone', async (request, env) => {
  const src = await verifyDayOwnership(env.DB, request.params.id, request.userId);
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
      env.DB.prepare('INSERT INTO cameras (day_id, source_type, camera_name, resolution, codec, colorspace, gamma, lut, fps, audio, label, notes, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
        .bind(newDayId, c.source_type || 'camera', c.camera_name, c.resolution, c.codec, c.colorspace, c.gamma || '', c.lut, c.fps, c.audio || '', c.label, c.notes, c.sort_order)
    ),
  ];
  if (cloneStmts.length > 0) await env.DB.batch(cloneStmts);

  return Response.json({ id: newDayId });
});

// ===== BENCHMARKS =====

router.post('/days/:did/benchmarks', async (request, env) => {
  const day = await verifyDayOwnership(env.DB, request.params.did, request.userId);
  if (!day) return Response.json({ error: 'Day not found' }, { status: 404 });

  const did = request.params.did;
  const body = await request.json();
  const maxOrder = await env.DB.prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM benchmarks WHERE day_id = ?').bind(did).first();
  const result = await env.DB.prepare(
    'INSERT INTO benchmarks (day_id, drive_name, write_speed, read_speed, capacity, format, notes, sort_order) VALUES (?,?,?,?,?,?,?,?)'
  ).bind(did, body.drive_name || '', body.write_speed || 0, body.read_speed || 0, body.capacity || '', body.format || '', body.notes || '', maxOrder.m + 1).run();
  return Response.json({ id: result.meta.last_row_id });
});

router.put('/benchmarks/:id', async (request, env) => {
  const item = await verifyItemOwnership(env.DB, 'benchmarks', request.params.id, request.userId);
  if (!item) return Response.json({ error: 'Not found' }, { status: 404 });

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
  const item = await verifyItemOwnership(env.DB, 'benchmarks', request.params.id, request.userId);
  if (!item) return Response.json({ error: 'Not found' }, { status: 404 });
  await env.DB.prepare('DELETE FROM benchmarks WHERE id = ?').bind(request.params.id).run();
  return Response.json({ ok: true });
});

// ===== CAMERAS =====

router.post('/days/:did/cameras', async (request, env) => {
  const day = await verifyDayOwnership(env.DB, request.params.did, request.userId);
  if (!day) return Response.json({ error: 'Day not found' }, { status: 404 });

  const did = request.params.did;
  const body = await request.json();
  const maxOrder = await env.DB.prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM cameras WHERE day_id = ?').bind(did).first();
  const result = await env.DB.prepare(
    'INSERT INTO cameras (day_id, source_type, camera_name, resolution, codec, colorspace, gamma, lut, fps, audio, label, notes, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'
  ).bind(did, body.source_type || 'camera', body.camera_name || '', body.resolution || '', body.codec || '', body.colorspace || '', body.gamma || '', body.lut || '', body.fps || '', body.audio || '', body.label || '', body.notes || '', maxOrder.m + 1).run();
  return Response.json({ id: result.meta.last_row_id });
});

router.put('/cameras/:id', async (request, env) => {
  const item = await verifyItemOwnership(env.DB, 'cameras', request.params.id, request.userId);
  if (!item) return Response.json({ error: 'Not found' }, { status: 404 });

  const body = await request.json();
  const fields = ['source_type', 'camera_name', 'resolution', 'codec', 'colorspace', 'gamma', 'lut', 'fps', 'audio', 'label', 'notes', 'sort_order'];
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
  const src = await verifyItemOwnership(env.DB, 'cameras', request.params.id, request.userId);
  if (!src) return Response.json({ error: 'Not found' }, { status: 404 });
  const maxOrder = await env.DB.prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM cameras WHERE day_id = ?').bind(src.day_id).first();
  const result = await env.DB.prepare(
    'INSERT INTO cameras (day_id, source_type, camera_name, resolution, codec, colorspace, gamma, lut, fps, audio, label, notes, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'
  ).bind(src.day_id, src.source_type || 'camera', src.camera_name, src.resolution, src.codec, src.colorspace, src.gamma || '', src.lut, src.fps, src.audio || '', src.label, src.notes, maxOrder.m + 1).run();
  return Response.json({ id: result.meta.last_row_id });
});

router.delete('/cameras/:id', async (request, env) => {
  const item = await verifyItemOwnership(env.DB, 'cameras', request.params.id, request.userId);
  if (!item) return Response.json({ error: 'Not found' }, { status: 404 });
  await env.DB.prepare('DELETE FROM cameras WHERE id = ?').bind(request.params.id).run();
  return Response.json({ ok: true });
});

// ===== ROLLS =====

router.post('/days/:did/rolls', async (request, env) => {
  const day = await verifyDayOwnership(env.DB, request.params.did, request.userId);
  if (!day) return Response.json({ error: 'Day not found' }, { status: 404 });

  const did = request.params.did;
  const body = await request.json();
  const maxOrder = await env.DB.prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM rolls WHERE day_id = ?').bind(did).first();
  const result = await env.DB.prepare(
    'INSERT INTO rolls (day_id, roll_name, is_break, card_serial, gb, duration_tc, frames, master, backup, notes, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
  ).bind(did, body.roll_name || '', body.is_break ? 1 : 0, body.card_serial || '', body.gb || 0, body.duration_tc || '00:00:00:00', body.frames || 0, body.master ? 1 : 0, body.backup ? 1 : 0, body.notes || '', maxOrder.m + 1).run();
  return Response.json({ id: result.meta.last_row_id });
});

router.put('/rolls/:id', async (request, env) => {
  const item = await verifyItemOwnership(env.DB, 'rolls', request.params.id, request.userId);
  if (!item) return Response.json({ error: 'Not found' }, { status: 404 });

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
  const item = await verifyItemOwnership(env.DB, 'rolls', request.params.id, request.userId);
  if (!item) return Response.json({ error: 'Not found' }, { status: 404 });
  await env.DB.prepare('DELETE FROM rolls WHERE id = ?').bind(request.params.id).run();
  return Response.json({ ok: true });
});

// Reorder rolls
router.put('/days/:did/rolls/reorder', async (request, env) => {
  const day = await verifyDayOwnership(env.DB, request.params.did, request.userId);
  if (!day) return Response.json({ error: 'Day not found' }, { status: 404 });

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
  const project = await getFullProject(env.DB, request.params.id, request.userId);
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
  const project = await getFullProject(env.DB, request.params.id, request.userId);
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

// ===== ADMIN ROUTES =====

// List all users
router.get('/admin/users', async (request, env) => {
  if (!request.isAdmin) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { results: users } = await env.DB.prepare(
    'SELECT * FROM users ORDER BY created_at DESC'
  ).all();

  // Get project counts for each user
  const usersWithCounts = await Promise.all(users.map(async u => {
    const row = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM projects WHERE user_id = ?'
    ).bind(u.id).first();
    return { ...u, project_count: row.count };
  }));

  return Response.json(usersWithCounts);
});

// Get single user
router.get('/admin/users/:id', async (request, env) => {
  if (!request.isAdmin) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(request.params.id).first();
  if (!user) return Response.json({ error: 'User not found' }, { status: 404 });

  const { results: projects } = await env.DB.prepare(
    'SELECT id, title, archived, created_at, updated_at FROM projects WHERE user_id = ? ORDER BY updated_at DESC'
  ).bind(user.id).all();

  return Response.json({ ...user, projects });
});

// Update user
router.put('/admin/users/:id', async (request, env) => {
  if (!request.isAdmin) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  const body = await request.json();
  const fields = ['name', 'company', 'subscription_status'];
  const updates = [];
  const values = [];
  for (const f of fields) {
    if (body[f] !== undefined) { updates.push(`${f} = ?`); values.push(body[f]); }
  }
  if (updates.length === 0) return Response.json({ ok: true });
  updates.push("updated_at = datetime('now')");
  values.push(request.params.id);
  await env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();
  return Response.json({ ok: true });
});

// Delete user and all their data
router.delete('/admin/users/:id', async (request, env) => {
  if (!request.isAdmin) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  const userId = request.params.id;
  // Delete from Clerk
  if (env.CLERK_SECRET_KEY) {
    try {
      const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${env.CLERK_SECRET_KEY}` },
      });
      if (!res.ok && res.status !== 404) {
        console.error('Clerk user delete failed:', res.status, await res.text());
      }
    } catch (err) {
      console.error('Clerk user delete error:', err.message);
    }
  }
  // Delete all projects (cascading deletes handle days/benchmarks/cameras/rolls)
  await env.DB.prepare('DELETE FROM projects WHERE user_id = ?').bind(userId).run();
  await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
  return Response.json({ ok: true });
});

// Get current user info (for frontend)
router.get('/me', async (request, env) => {
  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(request.userId).first();
  return Response.json({
    ...(user || { id: request.userId }),
    isAdmin: request.isAdmin,
  });
});

// Sync user profile from Clerk client
router.put('/me', async (request, env) => {
  const body = await request.json();
  const { email, name } = body;
  await env.DB.prepare(
    "UPDATE users SET email = ?, name = ?, updated_at = datetime('now') WHERE id = ?"
  ).bind(email || '', name || '', request.userId).run();
  return Response.json({ ok: true });
});

// ===== CLERK WEBHOOKS =====

router.post('/webhooks/clerk', async (request, env) => {
  let evt;
  try {
    evt = await verifyWebhook(request, {
      signingSecret: env.CLERK_WEBHOOK_SIGNING_SECRET,
    });
  } catch (err) {
    console.error('Webhook verification failed:', err.message);
    return new Response(JSON.stringify({ error: 'Webhook verification failed' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (evt.type === 'user.created') {
    const { id, first_name, last_name, email_addresses, primary_email_address_id } = evt.data;
    const primaryEmail = email_addresses?.find(e => e.id === primary_email_address_id)?.email_address
      || email_addresses?.[0]?.email_address || '';
    const name = [first_name, last_name].filter(Boolean).join(' ');
    try {
      await env.DB.prepare(
        'INSERT OR IGNORE INTO users (id, email, name) VALUES (?, ?, ?)'
      ).bind(id, primaryEmail, name).run();
      try { await seedDemoProject(env.DB, id); } catch (e) { console.error('Demo seed error:', e.message); }
    } catch (err) {
      console.error('user.created handler error:', err.message);
    }
  }

  else if (evt.type === 'user.updated') {
    const { id, first_name, last_name, email_addresses, primary_email_address_id } = evt.data;
    const primaryEmail = email_addresses?.find(e => e.id === primary_email_address_id)?.email_address
      || email_addresses?.[0]?.email_address || '';
    const name = [first_name, last_name].filter(Boolean).join(' ');
    await env.DB.prepare(
      "UPDATE users SET email = ?, name = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(primaryEmail, name, id).run();
  }

  else if (evt.type === 'user.deleted') {
    const userId = evt.data.id;
    if (userId) {
      await env.DB.prepare('DELETE FROM projects WHERE user_id = ?').bind(userId).run();
      await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
    }
  }

  return Response.json({ received: true });
});

// Pages Function entry point
export async function onRequest(context) {
  await ensureDB(context.env.DB);
  // Copy auth data from middleware (context.data) onto request for itty-router handlers
  const request = context.request;
  request.userId = context.data.userId;
  request.isAdmin = context.data.isAdmin;
  request.realUserId = context.data.realUserId;
  return router.fetch(request, context.env);
}
