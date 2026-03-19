import { AutoRouter, error, json } from 'itty-router';
import puppeteer from '@cloudflare/puppeteer';
import { computeDayTotals, computeProjectTotals, computeCumulativeTotals } from '../../lib/calculations.js';
import { renderStandaloneHTML, renderPrintHTML } from '../../lib/report-renderer.js';
import { getFullProject } from '../../lib/db-helpers.js';

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
      env.DB.prepare('INSERT INTO cameras (day_id, camera_name, resolution, codec, colorspace, lut, fps, label, notes, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?)')
        .bind(newDayId, c.camera_name, c.resolution, c.codec, c.colorspace, c.lut, c.fps, c.label, c.notes, c.sort_order)
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
    'INSERT INTO cameras (day_id, camera_name, resolution, codec, colorspace, lut, fps, label, notes, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?)'
  ).bind(did, body.camera_name || '', body.resolution || '', body.codec || '', body.colorspace || '', body.lut || '', body.fps || '23.976', body.label || '', body.notes || '', maxOrder.m + 1).run();
  return Response.json({ id: result.meta.last_row_id });
});

router.put('/cameras/:id', async (request, env) => {
  const body = await request.json();
  const fields = ['camera_name', 'resolution', 'codec', 'colorspace', 'lut', 'fps', 'label', 'notes', 'sort_order'];
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
    await page.setContent(html, { waitUntil: 'load' });
    const pdf = await page.pdf({
      format: 'A4',
      landscape: true,
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
  return router.fetch(context.request, context.env);
}
