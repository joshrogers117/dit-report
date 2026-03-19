const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/days/:did/cameras', (req, res) => {
  const did = req.params.did;
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM cameras WHERE day_id = ?').get(did).m;
  const { camera_name, resolution, codec, colorspace, lut, fps, label, notes } = req.body;
  const result = db.prepare(`
    INSERT INTO cameras (day_id, camera_name, resolution, codec, colorspace, lut, fps, label, notes, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(did, camera_name || '', resolution || '', codec || '', colorspace || '', lut || '', fps || '23.976', label || '', notes || '', maxOrder + 1);
  res.json({ id: result.lastInsertRowid });
});

router.put('/cameras/:id', (req, res) => {
  const fields = ['camera_name', 'resolution', 'codec', 'colorspace', 'lut', 'fps', 'label', 'notes', 'sort_order'];
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
  db.prepare(`UPDATE cameras SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  res.json({ ok: true });
});

router.delete('/cameras/:id', (req, res) => {
  db.prepare('DELETE FROM cameras WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
