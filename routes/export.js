const express = require('express');
const router = express.Router();
const db = require('../db');
const puppeteer = require('puppeteer');
const { computeDayTotals, computeProjectTotals, computeCumulativeTotals } = require('../lib/calculations');
const { renderStandaloneHTML, renderPrintHTML } = require('../lib/report-renderer');

function getFullProject(id) {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  if (!project) return null;
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
  return { ...project, days: daysWithData, totals: projectTotals, cumulative };
}

// HTML export
router.get('/projects/:id/export/html', (req, res) => {
  const project = getFullProject(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const html = renderStandaloneHTML(project);
  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Content-Disposition', `attachment; filename="${project.title} - DIT Report.html"`);
  res.send(html);
});

// PDF export
router.get('/projects/:id/export/pdf', async (req, res) => {
  const project = getFullProject(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const html = renderPrintHTML(project);

  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '0.4in', bottom: '0.4in', left: '0.5in', right: '0.5in' }
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${project.title} - DIT Report.pdf"`);
    res.send(pdf);
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: 'PDF generation failed' });
  } finally {
    if (browser) await browser.close();
  }
});

module.exports = router;
