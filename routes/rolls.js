const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/days/:did/rolls', (req, res) => {
  const did = req.params.did;
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM rolls WHERE day_id = ?').get(did).m;
  const { roll_name, is_break, card_serial, gb, duration_tc, frames, master, backup, notes } = req.body;
  const result = db.prepare(`
    INSERT INTO rolls (day_id, roll_name, is_break, card_serial, gb, duration_tc, frames, master, backup, notes, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(did, roll_name || '', is_break ? 1 : 0, card_serial || '', gb || 0, duration_tc || '00:00:00:00', frames || 0, master ? 1 : 0, backup ? 1 : 0, notes || '', maxOrder + 1);
  res.json({ id: result.lastInsertRowid });
});

router.put('/rolls/:id', (req, res) => {
  const fields = ['roll_name', 'is_break', 'card_serial', 'gb', 'duration_tc', 'frames', 'master', 'backup', 'notes', 'sort_order'];
  const updates = [];
  const values = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      values.push(f === 'is_break' || f === 'master' || f === 'backup' ? (req.body[f] ? 1 : 0) : req.body[f]);
    }
  }
  if (updates.length === 0) return res.json({ ok: true });
  values.push(req.params.id);
  db.prepare(`UPDATE rolls SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  res.json({ ok: true });
});

router.delete('/rolls/:id', (req, res) => {
  db.prepare('DELETE FROM rolls WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Reorder rolls
router.put('/days/:did/rolls/reorder', (req, res) => {
  const { order } = req.body; // array of roll IDs in desired order
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order must be an array' });
  const stmt = db.prepare('UPDATE rolls SET sort_order = ? WHERE id = ? AND day_id = ?');
  const did = req.params.did;
  const txn = db.transaction(() => {
    order.forEach((id, idx) => stmt.run(idx, id, did));
  });
  txn();
  res.json({ ok: true });
});

module.exports = router;
