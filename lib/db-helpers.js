import { computeDayTotals, computeProjectTotals, computeCumulativeTotals } from './calculations.js';

export async function getFullProject(db, id) {
  const project = await db.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first();
  if (!project) return null;

  const { results: days } = await db.prepare(
    'SELECT * FROM shoot_days WHERE project_id = ? ORDER BY sort_order, day_number'
  ).bind(project.id).all();

  const daysWithData = await Promise.all(days.map(async d => {
    const [benchRes, camRes, rollRes] = await Promise.all([
      db.prepare('SELECT * FROM benchmarks WHERE day_id = ? ORDER BY sort_order').bind(d.id).all(),
      db.prepare('SELECT * FROM cameras WHERE day_id = ? ORDER BY sort_order').bind(d.id).all(),
      db.prepare('SELECT * FROM rolls WHERE day_id = ? ORDER BY sort_order').bind(d.id).all(),
    ]);
    const totals = computeDayTotals(rollRes.results);
    return { ...d, benchmarks: benchRes.results, cameras: camRes.results, rolls: rollRes.results, totals };
  }));

  const dayTotals = daysWithData.map(d => d.totals);
  const projectTotals = computeProjectTotals(dayTotals);
  const cumulative = computeCumulativeTotals(dayTotals);
  return { ...project, days: daysWithData, totals: projectTotals, cumulative };
}
