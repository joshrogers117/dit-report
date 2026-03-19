const express = require('express');
const router = express.Router();
const db = require('../db');

// Create shoot day
router.post('/projects/:pid/days', (req, res) => {
  const pid = req.params.pid;
  const { date, day_number } = req.body;
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM shoot_days WHERE project_id = ?').get(pid).m;
  const maxDay = db.prepare('SELECT COALESCE(MAX(day_number), 0) as m FROM shoot_days WHERE project_id = ?').get(pid).m;
  const result = db.prepare(`
    INSERT INTO shoot_days (project_id, day_number, date, sort_order)
    VALUES (?, ?, ?, ?)
  `).run(pid, day_number || maxDay + 1, date || new Date().toISOString().slice(0, 10), maxOrder + 1);
  db.prepare("UPDATE projects SET updated_at = datetime('now') WHERE id = ?").run(pid);
  res.json({ id: result.lastInsertRowid });
});

// Get single day
router.get('/days/:id', (req, res) => {
  const day = db.prepare('SELECT * FROM shoot_days WHERE id = ?').get(req.params.id);
  if (!day) return res.status(404).json({ error: 'Day not found' });
  const benchmarks = db.prepare('SELECT * FROM benchmarks WHERE day_id = ? ORDER BY sort_order').all(day.id);
  const cameras = db.prepare('SELECT * FROM cameras WHERE day_id = ? ORDER BY sort_order').all(day.id);
  const rolls = db.prepare('SELECT * FROM rolls WHERE day_id = ? ORDER BY sort_order').all(day.id);
  res.json({ ...day, benchmarks, cameras, rolls });
});

// Update day
router.put('/days/:id', (req, res) => {
  const { date, day_number } = req.body;
  if (date !== undefined) db.prepare('UPDATE shoot_days SET date = ? WHERE id = ?').run(date, req.params.id);
  if (day_number !== undefined) db.prepare('UPDATE shoot_days SET day_number = ? WHERE id = ?').run(day_number, req.params.id);
  res.json({ ok: true });
});

// Delete day
router.delete('/days/:id', (req, res) => {
  db.prepare('DELETE FROM shoot_days WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Clone day (copies benchmarks + cameras, not rolls)
router.post('/days/:id/clone', (req, res) => {
  const src = db.prepare('SELECT * FROM shoot_days WHERE id = ?').get(req.params.id);
  if (!src) return res.status(404).json({ error: 'Day not found' });

  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM shoot_days WHERE project_id = ?').get(src.project_id).m;
  const maxDay = db.prepare('SELECT COALESCE(MAX(day_number), 0) as m FROM shoot_days WHERE project_id = ?').get(src.project_id).m;

  const newDate = req.body.date || new Date().toISOString().slice(0, 10);
  const result = db.prepare(`
    INSERT INTO shoot_days (project_id, day_number, date, sort_order)
    VALUES (?, ?, ?, ?)
  `).run(src.project_id, maxDay + 1, newDate, maxOrder + 1);
  const newDayId = result.lastInsertRowid;

  // Clone benchmarks
  const benchmarks = db.prepare('SELECT * FROM benchmarks WHERE day_id = ?').all(src.id);
  const insertBench = db.prepare('INSERT INTO benchmarks (day_id, drive_name, write_speed, read_speed, capacity, format, notes, sort_order) VALUES (?,?,?,?,?,?,?,?)');
  for (const b of benchmarks) {
    insertBench.run(newDayId, b.drive_name, b.write_speed, b.read_speed, b.capacity, b.format, b.notes, b.sort_order);
  }

  // Clone cameras
  const cameras = db.prepare('SELECT * FROM cameras WHERE day_id = ?').all(src.id);
  const insertCam = db.prepare('INSERT INTO cameras (day_id, camera_name, resolution, codec, colorspace, lut, fps, label, notes, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?)');
  for (const c of cameras) {
    insertCam.run(newDayId, c.camera_name, c.resolution, c.codec, c.colorspace, c.lut, c.fps, c.label, c.notes, c.sort_order);
  }

  res.json({ id: newDayId });
});

module.exports = router;
