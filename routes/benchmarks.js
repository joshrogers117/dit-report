const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/days/:did/benchmarks', (req, res) => {
  const did = req.params.did;
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM benchmarks WHERE day_id = ?').get(did).m;
  const { drive_name, write_speed, read_speed, capacity, format, notes } = req.body;
  const result = db.prepare(`
    INSERT INTO benchmarks (day_id, drive_name, write_speed, read_speed, capacity, format, notes, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(did, drive_name || '', write_speed || 0, read_speed || 0, capacity || '', format || '', notes || '', maxOrder + 1);
  res.json({ id: result.lastInsertRowid });
});

router.put('/benchmarks/:id', (req, res) => {
  const fields = ['drive_name', 'write_speed', 'read_speed', 'capacity', 'format', 'notes', 'sort_order'];
  const updates = [];
  const values = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      values.push(req.body[f]);
    }
  }
  if (updates.length === 0) return res.json({ ok: true });
  values.push(req.params.id);
  db.prepare(`UPDATE benchmarks SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  res.json({ ok: true });
});

router.delete('/benchmarks/:id', (req, res) => {
  db.prepare('DELETE FROM benchmarks WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
