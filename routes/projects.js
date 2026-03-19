const express = require('express');
const router = express.Router();
const db = require('../db');
const { computeDayTotals, computeProjectTotals, computeCumulativeTotals } = require('../lib/calculations');

// List all projects
router.get('/', (req, res) => {
  const projects = db.prepare('SELECT * FROM projects ORDER BY updated_at DESC').all();
  // Attach summary info to each project
  const result = projects.map(p => {
    const days = db.prepare('SELECT * FROM shoot_days WHERE project_id = ? ORDER BY sort_order, day_number').all(p.id);
    const dayTotals = days.map(d => {
      const rolls = db.prepare('SELECT * FROM rolls WHERE day_id = ? ORDER BY sort_order').all(d.id);
      return computeDayTotals(rolls);
    });
    const totals = computeProjectTotals(dayTotals);
    return { ...p, dayCount: days.length, totals };
  });
  res.json(result);
});

// Create project
router.post('/', (req, res) => {
  const { title, production_company, client, director, producer, dp, first_ac, dit_name, dit_email, dit_phone } = req.body;
  const result = db.prepare(`
    INSERT INTO projects (title, production_company, client, director, producer, dp, first_ac, dit_name, dit_email, dit_phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title || 'Untitled Project', production_company || '', client || '', director || '', producer || '', dp || '', first_ac || '', dit_name || '', dit_email || '', dit_phone || '');
  res.json({ id: result.lastInsertRowid });
});

// Get full project with all nested data
router.get('/:id', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const days = db.prepare('SELECT * FROM shoot_days WHERE project_id = ? ORDER BY sort_order, day_number').all(project.id);
  const daysWithData = days.map(d => {
    const benchmarks = db.prepare('SELECT * FROM benchmarks WHERE day_id = ? ORDER BY sort_order').all(d.id);
    const cameras = db.prepare('SELECT * FROM cameras WHERE day_id = ? ORDER BY sort_order').all(d.id);
    const rolls = db.prepare('SELECT * FROM rolls WHERE day_id = ? ORDER BY sort_order').all(d.id);
    const totals = computeDayTotals(rolls);
    return { ...d, benchmarks, cameras, rolls, totals };
  });

  const dayTotals = daysWithData.map(d => d.totals);
  const projectTotals = computeProjectTotals(dayTotals);
  const cumulative = computeCumulativeTotals(dayTotals);

  res.json({ ...project, days: daysWithData, totals: projectTotals, cumulative });
});

// Update project
router.put('/:id', (req, res) => {
  const fields = ['title', 'production_company', 'client', 'director', 'producer', 'dp', 'first_ac', 'dit_name', 'dit_email', 'dit_phone'];
  const updates = [];
  const values = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      values.push(req.body[f]);
    }
  }
  if (updates.length === 0) return res.json({ ok: true });
  updates.push("updated_at = datetime('now')");
  values.push(req.params.id);
  db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  res.json({ ok: true });
});

// Delete project
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
