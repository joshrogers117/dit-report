// Server-side report renderer
// Generates self-contained HTML for both interactive export and PDF print layout

import { computeCumulativeTotals } from './calculations.js';

const REPORT_CSS = `
:root {
  --bg: #0e1117; --surface: #161b22; --surface2: #1c2333; --border: #30363d;
  --text: #e6edf3; --text-dim: #8b949e; --accent: #58a6ff; --accent2: #3fb950;
  --accent3: #d29922; --danger: #f85149; --radius: 10px; --shadow: 0 2px 12px rgba(0,0,0,.4);
}
.theme-light {
  --bg: #f0f2f5; --surface: #ffffff; --surface2: #f8f9fa; --border: #d0d7de;
  --text: #1f2328; --text-dim: #656d76; --accent: #0969da; --accent2: #1a7f37;
  --accent3: #9a6700; --danger: #cf222e; --shadow: 0 2px 12px rgba(0,0,0,.08);
}
.theme-film {
  --bg: #1a1410; --surface: #231c15; --surface2: #2a2118; --border: #3d3229;
  --text: #e8ddd0; --text-dim: #9a8b7a; --accent: #d4a574; --accent2: #7ab87a;
  --accent3: #d4a030; --danger: #d45050; --shadow: 0 2px 12px rgba(0,0,0,.5);
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif;
  background: var(--bg); color: var(--text); line-height: 1.5; min-height: 100vh;
  transition: background .3s, color .3s;
}
.container { max-width: 1200px; margin: 0 auto; padding: 24px; }
.report-header { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 28px 32px; margin-bottom: 24px; box-shadow: var(--shadow); }
.report-header h1 { font-size: 26px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 4px; }
.report-header .subtitle { color: var(--text-dim); font-size: 14px; }
.header-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-top: 20px; }
.header-item label { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 1.2px; color: var(--text-dim); margin-bottom: 2px; font-weight: 600; }
.header-item span { font-size: 14px; font-weight: 500; }
.controls { display: flex; gap: 8px; align-items: center; margin-bottom: 24px; flex-wrap: wrap; }
.controls label { font-size: 12px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin-right: 4px; }
.btn { background: var(--surface); border: 1px solid var(--border); color: var(--text); padding: 7px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all .15s; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
.btn:hover { border-color: var(--accent); color: var(--accent); }
.btn.active { background: var(--accent); color: #fff; border-color: var(--accent); }
.spacer { flex: 1; }
.stats-bar { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 24px; }
.stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px 20px; box-shadow: var(--shadow); }
.stat-card .stat-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1.2px; color: var(--text-dim); font-weight: 600; }
.stat-card .stat-value { font-size: 24px; font-weight: 700; margin-top: 4px; letter-spacing: -0.5px; }
.stat-card .stat-unit { font-size: 13px; color: var(--text-dim); font-weight: 400; }
.day-tabs { display: flex; gap: 4px; margin-bottom: 20px; }
.day-tab { background: var(--surface); border: 1px solid var(--border); color: var(--text-dim); padding: 10px 24px; border-radius: 8px 8px 0 0; cursor: pointer; font-size: 14px; font-weight: 600; transition: all .15s; border-bottom: 2px solid transparent; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
.day-tab:hover { color: var(--text); }
.day-tab.active { color: var(--accent); border-bottom-color: var(--accent); background: var(--surface2); }
.section { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); margin-bottom: 16px; box-shadow: var(--shadow); overflow: hidden; }
.section-header { padding: 14px 20px; font-size: 12px; text-transform: uppercase; letter-spacing: 1.2px; font-weight: 700; color: var(--text-dim); border-bottom: 1px solid var(--border); background: var(--surface2); }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; padding: 10px 16px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-dim); font-weight: 600; border-bottom: 1px solid var(--border); background: var(--surface2); }
td { padding: 10px 16px; border-bottom: 1px solid var(--border); vertical-align: middle; }
tr:last-child td { border-bottom: none; }
.mono { font-family: 'SF Mono','Menlo','Monaco', monospace; font-size: 12px; }
.badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; letter-spacing: 0.3px; }
.badge-ok { background: rgba(63,185,80,.15); color: var(--accent2); }
.badge-break { background: rgba(88,166,255,.1); color: var(--accent); font-style: italic; }
.camera-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; padding: 16px; }
.camera-card { background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 16px; position: relative; overflow: hidden; }
.camera-card .brand-logo { position: absolute; top: 10px; right: 10px; width: 40px; height: 40px; opacity: 0.1; filter: brightness(0) invert(1); }
.camera-card h3 { font-size: 15px; font-weight: 700; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
.camera-card .cam-label { font-size: 10px; background: var(--accent); color: #fff; padding: 1px 6px; border-radius: 4px; font-weight: 700; }
.camera-card .cam-specs { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.camera-card .cam-spec-label, .cam-spec-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-dim); }
.camera-card .cam-spec-value, .cam-spec-value { font-size: 13px; font-weight: 500; }
.bench-bar-container { display: flex; align-items: center; gap: 8px; }
.bench-bar { flex: 1; height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; max-width: 120px; }
.bench-bar-fill { height: 100%; border-radius: 3px; }
.bench-bar-fill.write { background: var(--accent); }
.bench-bar-fill.read { background: var(--accent2); }
.check { color: var(--accent2); font-weight: bold; }
.cross { color: var(--danger); }
.summary-row td { font-weight: 700; background: var(--surface2); border-top: 2px solid var(--border); }
.rolls-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; padding: 16px; }
.roll-card { background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 16px; }
.roll-card.is-break { border-style: dashed; opacity: .6; text-align: center; display: flex; align-items: center; justify-content: center; font-style: italic; color: var(--text-dim); }
.roll-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.roll-card-header h4 { font-size: 14px; font-family: 'SF Mono', monospace; font-weight: 700; }
.roll-card-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.roll-card-note { margin-top: 8px; font-size: 12px; color: var(--text-dim); font-style: italic; }
.layout-toggle { display: flex; gap: 2px; background: var(--surface2); border-radius: 6px; padding: 2px; border: 1px solid var(--border); }
.layout-toggle .btn { border: none; background: transparent; padding: 5px 12px; border-radius: 4px; font-size: 12px; }
.layout-toggle .btn.active { background: var(--accent); color: #fff; }
.all-days-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 16px; margin-bottom: 24px; }
.day-summary-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; box-shadow: var(--shadow); cursor: pointer; transition: border-color .15s, transform .15s; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
.day-summary-card:hover { border-color: var(--accent); transform: translateY(-2px); }
.day-summary-card h3 { font-size: 18px; margin-bottom: 4px; }
.day-summary-card .day-date { color: var(--text-dim); font-size: 13px; margin-bottom: 12px; }
.day-summary-card .day-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.day-summary-card .day-stat-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-dim); }
.day-summary-card .day-stat-value { font-size: 16px; font-weight: 700; }
.report-footer { text-align: center; padding: 32px; color: var(--text-dim); font-size: 12px; }
@media (max-width: 768px) {
  .container { padding: 12px; }
  .report-header { padding: 20px; }
  .header-grid { grid-template-columns: 1fr 1fr; }
  .stats-bar { grid-template-columns: 1fr 1fr; }
  th, td { padding: 8px 10px; font-size: 12px; }
}
`;

const PRINT_EXTRA_CSS = `
@media print { .day-section { page-break-inside: avoid; } }
.day-section { margin-bottom: 32px; }
.day-section:not(:first-of-type) { page-break-before: always; }
.day-divider { border-top: 2px solid var(--accent); margin: 32px 0 24px; padding-top: 16px; }
.cumulative-bar { background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 12px 20px; margin-top: 12px; display: flex; gap: 32px; font-size: 13px; }
.cumulative-bar .cum-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-dim); font-weight: 600; }
.cumulative-bar .cum-value { font-weight: 700; font-family: 'SF Mono', monospace; }
`;

function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtNum(n, decimals = 2) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtInt(n) {
  return Number(n || 0).toLocaleString('en-US');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function shortDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function statusBadge(val) {
  if (val === 1 || val === true) return '<span class="check">&#10003;</span>';
  if (val === 0 || val === false) return '<span class="cross">&#10005;</span>';
  return '<span style="color:var(--text-dim)">&mdash;</span>';
}

function renderHeaderHTML(project) {
  const dates = project.days.map(d => d.date).filter(Boolean).sort();
  const dateRange = dates.length > 1
    ? `${shortDate(dates[0])}&ndash;${shortDate(dates[dates.length - 1])}, ${new Date(dates[0]+'T00:00:00').getFullYear()}`
    : dates.length === 1 ? formatDate(dates[0]) : '';

  return `<div class="report-header">
    <h1>${esc(project.title)}</h1>
    <div class="subtitle">DIT Offload Report &mdash; ${esc(project.production_company)}</div>
    <div class="header-grid">
      ${project.director ? `<div class="header-item"><label>Director</label><span>${esc(project.director)}</span></div>` : ''}
      ${project.producer ? `<div class="header-item"><label>Producer</label><span>${esc(project.producer)}</span></div>` : ''}
      ${project.dp ? `<div class="header-item"><label>DP</label><span>${esc(project.dp)}</span></div>` : ''}
      ${project.first_ac ? `<div class="header-item"><label>1st AC</label><span>${esc(project.first_ac)}</span></div>` : ''}
      ${project.client ? `<div class="header-item"><label>Client</label><span>${esc(project.client)}</span></div>` : ''}
      ${project.dit_name ? `<div class="header-item"><label>DIT / Data Manager</label><span>${esc(project.dit_name)}</span></div>` : ''}
      ${project.dit_email ? `<div class="header-item"><label>Email</label><span>${esc(project.dit_email)}</span></div>` : ''}
      ${project.dit_phone ? `<div class="header-item"><label>Phone</label><span>${esc(project.dit_phone)}</span></div>` : ''}
      ${dateRange ? `<div class="header-item"><label>Shoot Dates</label><span>${dateRange}</span></div>` : ''}
    </div>
  </div>`;
}

function renderStatsBar(totals) {
  return `<div class="stats-bar">
    <div class="stat-card"><div class="stat-label">Total Data</div><div class="stat-value">${fmtInt(Math.round(totals.gb))} <span class="stat-unit">GB</span></div></div>
    <div class="stat-card"><div class="stat-label">Total Duration</div><div class="stat-value">${totals.duration ? totals.duration.substring(0,8) : '00:00:00'}</div></div>
    <div class="stat-card"><div class="stat-label">Shoot Days</div><div class="stat-value">${totals.dayCount || 0}</div></div>
    <div class="stat-card"><div class="stat-label">Total Rolls</div><div class="stat-value">${totals.rollCount || 0}</div></div>
  </div>`;
}

function renderBenchmarks(benchmarks, maxBench) {
  if (!benchmarks || benchmarks.length === 0) return '';
  return `<div class="section">
    <div class="section-header">Drive Benchmarks (MB/s)</div>
    <table>
      <tr><th>Drive</th><th>Write</th><th>Read</th><th>Capacity</th><th>Format</th><th>Notes</th></tr>
      ${benchmarks.map(b => `<tr>
        <td class="mono" style="font-weight:600">${esc(b.drive_name)}</td>
        <td><div class="bench-bar-container">
          <span class="mono">${fmtNum(b.write_speed, 1)}</span>
          <div class="bench-bar"><div class="bench-bar-fill write" style="width:${maxBench ? (b.write_speed/maxBench*100).toFixed(1) : 0}%"></div></div>
        </div></td>
        <td><div class="bench-bar-container">
          <span class="mono">${fmtNum(b.read_speed, 1)}</span>
          <div class="bench-bar"><div class="bench-bar-fill read" style="width:${maxBench ? (b.read_speed/maxBench*100).toFixed(1) : 0}%"></div></div>
        </div></td>
        <td>${esc(b.capacity)}</td>
        <td class="mono">${esc(b.format)}</td>
        <td style="color:var(--text-dim);font-size:12px">${esc(b.notes)}</td>
      </tr>`).join('')}
    </table>
  </div>`;
}

function detectBrand(name) {
  const n = (name || '').toUpperCase();
  const brands = {
    red: ['V-RAPTOR','KOMODO','RED ONE','EPIC-X','EPIC-W','EPIC-M','SCARLET-W','SCARLET-X','RAVEN','WEAPON','MONSTRO','HELIUM','GEMINI','DRAGON','RANGER','DSMC','RED EPIC','RED SCARLET','RED RAVEN','RED RANGER','KOMODO-X'],
    arri: ['ALEXA','AMIRA','ARRICAM','ARRIFLEX'],
    blackmagic: ['URSA','BMPCC','PYXIS','POCKET CINEMA','MICRO CINEMA','BLACKMAGIC'],
    sony: ['VENICE','BURANO','FX3','FX30','FX6','FX9','FR7','A7S','A7R','A7C','A7 IV','A7IV','A9 ','A1 ','F5 ','F55','F65','FS5','FS7','FS100','FS700','CINEALTA','HDW-F'],
    canon: ['C70','C80','C100','C200','C300','C400','C500','C700','R5 C','R5C','EOS C','CINEMA EOS','1D C','1DC'],
    dji: ['RONIN','ZENMUSE','INSPIRE','MAVIC','OSMO','AVATA','AIR 2S','MINI 3','MINI 4','DJI ACTION'],
    nikon: ['NIKON Z','Z5','Z6','Z7','Z8','Z9','Z30','Z50',' ZR',' ZF',' ZFC'],
    apple: ['IPHONE','IPAD'],
  };
  for (const [brand, keywords] of Object.entries(brands))
    if (keywords.some(k => n.includes(k))) return brand;
  return null;
}

function renderSourceSpecs(c) {
  const type = c.source_type || 'camera';
  if (type === 'audio') {
    return `
      ${c.resolution ? `<div><div class="cam-spec-label">Sample Rate</div><div class="cam-spec-value mono">${esc(c.resolution)}</div></div>` : ''}
      ${c.codec ? `<div><div class="cam-spec-label">Bit Depth</div><div class="cam-spec-value mono">${esc(c.codec)}</div></div>` : ''}
      ${c.fps ? `<div><div class="cam-spec-label">Channels</div><div class="cam-spec-value">${esc(c.fps)}</div></div>` : ''}`;
  }
  if (type === 'photo') {
    return `${c.codec ? `<div><div class="cam-spec-label">Format</div><div class="cam-spec-value mono">${esc(c.codec)}</div></div>` : ''}`;
  }
  if (type === 'misc') {
    return `
      ${c.resolution ? `<div><div class="cam-spec-label">Resolution</div><div class="cam-spec-value">${esc(c.resolution)}</div></div>` : ''}
      ${c.codec ? `<div><div class="cam-spec-label">Codec</div><div class="cam-spec-value mono">${esc(c.codec)}</div></div>` : ''}`;
  }
  // camera (default)
  return `
    <div><div class="cam-spec-label">Resolution</div><div class="cam-spec-value">${esc(c.resolution)}</div></div>
    <div><div class="cam-spec-label">Codec</div><div class="cam-spec-value mono">${esc(c.codec)}</div></div>
    <div><div class="cam-spec-label">Colorspace</div><div class="cam-spec-value mono">${esc(c.colorspace)}</div></div>
    <div><div class="cam-spec-label">LUT</div><div class="cam-spec-value mono">${esc(c.lut)}</div></div>
    <div><div class="cam-spec-label">FPS</div><div class="cam-spec-value">${esc(c.fps)}</div></div>
    ${c.audio ? `<div><div class="cam-spec-label">Audio</div><div class="cam-spec-value">${esc(c.audio)}</div></div>` : ''}`;
}

function renderCameras(cameras) {
  if (!cameras || cameras.length === 0) return '';
  const typeLabels = { camera: 'Video', audio: 'Audio', photo: 'Photo', misc: 'Misc Source' };
  return `<div class="section">
    <div class="section-header">Media Sources</div>
    <div class="camera-cards">
      ${cameras.map(c => {
        const brand = detectBrand(c.camera_name);
        const type = c.source_type || 'camera';
        const badgeHtml = type !== 'camera' ? `<span class="cam-label" style="background:var(--accent3)">${typeLabels[type]}</span>` : '';
        return `<div class="camera-card">
        ${brand ? `<img class="brand-logo" src="/icons/cameras/${brand}.svg" alt="">` : ''}
        <h3>${esc(c.camera_name)} ${c.label ? `<span class="cam-label">${esc(c.label)}</span>` : ''} ${badgeHtml}</h3>
        <div class="cam-specs">${renderSourceSpecs(c)}</div>
        ${c.notes ? `<div style="margin-top:8px;font-size:12px;color:var(--text-dim)">${esc(c.notes)}</div>` : ''}
      </div>`; }).join('')}
    </div>
  </div>`;
}

function renderRollsTable(rolls, totals) {
  if (!rolls || rolls.length === 0) return '';
  return `<div class="section">
    <div class="section-header">Card Offloads</div>
    <table>
      <tr><th>Roll</th><th>Card Serial</th><th style="text-align:right">GB</th><th>Duration</th><th style="text-align:center">Master</th><th style="text-align:center">Backup</th><th>Notes</th></tr>
      ${rolls.map(r => {
        if (r.is_break) return `<tr><td colspan="7" style="text-align:center"><span class="badge badge-break">${esc(r.roll_name)}</span></td></tr>`;
        return `<tr>
          <td class="mono" style="font-weight:600">${esc(r.roll_name)}</td>
          <td class="mono" style="color:var(--text-dim)">${esc(r.card_serial)}</td>
          <td class="mono" style="text-align:right">${fmtNum(r.gb)}</td>
          <td class="mono">${esc(r.duration_tc)}</td>
          <td style="text-align:center">${statusBadge(r.master)}</td>
          <td style="text-align:center">${statusBadge(r.backup)}</td>
          <td style="color:var(--text-dim);font-size:12px;max-width:200px">${esc(r.notes)}</td>
        </tr>`;
      }).join('')}
      <tr class="summary-row">
        <td>WRAP</td><td></td>
        <td class="mono" style="text-align:right">${fmtNum(totals.gb)}</td>
        <td class="mono">${totals.duration}</td>
        <td></td><td></td>
        <td></td>
      </tr>
    </table>
  </div>`;
}

function getMaxBenchmark(days) {
  let max = 0;
  for (const d of days) {
    for (const b of (d.benchmarks || [])) {
      max = Math.max(max, b.write_speed || 0, b.read_speed || 0);
    }
  }
  return max;
}

// ===== STANDALONE HTML EXPORT (interactive, with tabs/themes) =====

function renderStandaloneHTML(project) {
  // Transform data to match the frontend JS format
  const maxBench = getMaxBenchmark(project.days);
  const daysData = project.days.map(d => ({
    date: d.date,
    label: `Day ${String(d.day_number).padStart(2, '0')}`,
    dateFormatted: formatDate(d.date),
    benchmarks: d.benchmarks.map(b => ({
      name: b.drive_name, write: b.write_speed, read: b.read_speed,
      capacity: b.capacity, format: b.format, notes: b.notes
    })),
    cameras: d.cameras.map(c => ({
      type: c.source_type || 'camera', name: c.camera_name, res: c.resolution, codec: c.codec,
      colorspace: c.colorspace, lut: c.lut, fps: c.fps, audio: c.audio, label: c.label
    })),
    rolls: d.rolls.map(r => ({
      roll: r.roll_name, serial: r.card_serial, gb: r.gb,
      duration: r.duration_tc, master: !!r.master, backup: !!r.backup,
      notes: r.notes, frames: r.frames, isBreak: !!r.is_break
    })),
    totals: d.totals
  }));

  const dates = project.days.map(d => d.date).filter(Boolean).sort();
  const dateRange = dates.length > 1
    ? `${shortDate(dates[0])}&ndash;${shortDate(dates[dates.length - 1])}, ${new Date(dates[0]+'T00:00:00').getFullYear()}`
    : dates.length === 1 ? formatDate(dates[0]) : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(project.title)} - DIT Report</title>
<style>${REPORT_CSS}</style>
</head>
<body>
<div class="container">
  ${renderHeaderHTML(project)}
  <div class="controls">
    <label>Theme:</label>
    <div class="layout-toggle" id="themeToggle">
      <button class="btn active" data-theme="">Dark</button>
      <button class="btn" data-theme="theme-light">Light</button>
      <button class="btn" data-theme="theme-film">Film</button>
    </div>
    <div class="spacer"></div>
    <label>Roll Layout:</label>
    <div class="layout-toggle" id="layoutToggle">
      <button class="btn active" data-layout="table">Table</button>
      <button class="btn" data-layout="cards">Cards</button>
    </div>
  </div>
  ${renderStatsBar(project.totals)}
  <div class="day-tabs">
    <button class="day-tab active" data-day="overview">Overview</button>
    ${project.days.map((d, i) => `<button class="day-tab" data-day="${i}">Day ${String(d.day_number).padStart(2, '0')} &mdash; ${shortDate(d.date)}</button>`).join('')}
  </div>
  <div id="content"></div>
  <div class="report-footer">DIT Offload Report &mdash; Generated from production data</div>
</div>
<script>
const DAYS = ${JSON.stringify(daysData)};
let currentDay = "overview";
let currentLayout = "table";
function bindAll(sel, fn) { document.querySelectorAll(sel).forEach(function(el){ el.addEventListener("click", function(e){e.preventDefault();fn(el,e);}); }); }
bindAll("#themeToggle [data-theme]", function(btn) {
  document.body.className = btn.dataset.theme;
  document.querySelectorAll("#themeToggle .btn").forEach(function(b){b.classList.toggle("active", b === btn)});
});
bindAll("#layoutToggle [data-layout]", function(btn) {
  currentLayout = btn.dataset.layout;
  document.querySelectorAll("#layoutToggle .btn").forEach(function(b){b.classList.toggle("active", b === btn)});
  render();
});
bindAll(".day-tab", function(tab) {
  currentDay = tab.dataset.day;
  document.querySelectorAll(".day-tab").forEach(function(t){t.classList.toggle("active", t === tab)});
  render();
});
function maxBenchmark() { let m=0; DAYS.forEach(d=>d.benchmarks.forEach(b=>{m=Math.max(m,b.write,b.read)})); return m; }
function statusBadge(v) { if(v===true) return '<span class="check">&#10003;</span>'; if(v===false) return '<span class="cross">&#10005;</span>'; return '<span style="color:var(--text-dim)">&mdash;</span>'; }
function renderBenchmarks(bm) { const mx=maxBenchmark(); return '<div class="section"><div class="section-header">Drive Benchmarks (MB/s)</div><table><tr><th>Drive</th><th>Write</th><th>Read</th><th>Capacity</th><th>Format</th><th>Notes</th></tr>'+bm.map(b=>'<tr><td class="mono" style="font-weight:600">'+b.name+'</td><td><div class="bench-bar-container"><span class="mono">'+b.write.toLocaleString()+'</span><div class="bench-bar"><div class="bench-bar-fill write" style="width:'+(b.write/mx*100).toFixed(1)+'%"></div></div></div></td><td><div class="bench-bar-container"><span class="mono">'+b.read.toLocaleString()+'</span><div class="bench-bar"><div class="bench-bar-fill read" style="width:'+(b.read/mx*100).toFixed(1)+'%"></div></div></div></td><td>'+b.capacity+'</td><td class="mono">'+b.format+'</td><td style="color:var(--text-dim);font-size:12px">'+b.notes+'</td></tr>').join('')+'</table></div>'; }
function renderCameras(cams) { return '<div class="section"><div class="section-header">Camera Settings</div><div class="camera-cards">'+cams.map(c=>'<div class="camera-card"><h3>'+c.name+' <span class="cam-label">'+c.label+'</span></h3><div class="cam-specs"><div><div class="cam-spec-label">Resolution</div><div class="cam-spec-value">'+c.res+'</div></div><div><div class="cam-spec-label">Codec</div><div class="cam-spec-value mono">'+c.codec+'</div></div><div><div class="cam-spec-label">Colorspace</div><div class="cam-spec-value mono">'+c.colorspace+'</div></div><div><div class="cam-spec-label">LUT</div><div class="cam-spec-value mono">'+c.lut+'</div></div><div><div class="cam-spec-label">FPS</div><div class="cam-spec-value">'+c.fps+'</div></div></div></div>').join('')+'</div></div>'; }
function renderRollsTable(rolls,totals) { return '<div class="section"><div class="section-header">Card Offloads</div><table><tr><th>Roll</th><th>Card Serial</th><th style="text-align:right">GB</th><th>Duration</th><th style="text-align:center">Master</th><th style="text-align:center">Backup</th><th>Notes</th></tr>'+rolls.map(r=>{if(r.isBreak) return '<tr><td colspan="7" style="text-align:center"><span class="badge badge-break">'+r.roll+'</span></td></tr>'; return '<tr><td class="mono" style="font-weight:600">'+r.roll+'</td><td class="mono" style="color:var(--text-dim)">'+r.serial+'</td><td class="mono" style="text-align:right">'+r.gb.toLocaleString(undefined,{minimumFractionDigits:2})+'</td><td class="mono">'+r.duration+'</td><td style="text-align:center">'+statusBadge(r.master)+'</td><td style="text-align:center">'+statusBadge(r.backup)+'</td><td style="color:var(--text-dim);font-size:12px;max-width:200px">'+r.notes+'</td></tr>';}).join('')+'<tr class="summary-row"><td>WRAP</td><td></td><td class="mono" style="text-align:right">'+totals.gb.toLocaleString(undefined,{minimumFractionDigits:2})+'</td><td class="mono">'+totals.duration+'</td><td></td><td></td><td></td></tr></table></div>'; }
function renderRollsCards(rolls,totals) { return '<div class="section"><div class="section-header">Card Offloads</div><div class="rolls-cards">'+rolls.map(r=>{if(r.isBreak) return '<div class="roll-card is-break">'+r.roll+'</div>'; return '<div class="roll-card"><div class="roll-card-header"><h4>'+r.roll+'</h4><div>'+(r.master?'<span class="badge badge-ok">Master</span>':'')+(r.backup?'<span class="badge badge-ok" style="margin-left:4px">Backup</span>':'')+'</div></div><div class="roll-card-meta"><div><div class="cam-spec-label">Size</div><div class="cam-spec-value mono">'+r.gb.toLocaleString(undefined,{minimumFractionDigits:2})+' GB</div></div><div><div class="cam-spec-label">Duration</div><div class="cam-spec-value mono">'+r.duration+'</div></div><div><div class="cam-spec-label">Card</div><div class="cam-spec-value mono" style="font-size:11px">'+r.serial+'</div></div></div>'+(r.notes?'<div class="roll-card-note">'+r.notes+'</div>':'')+'</div>';}).join('')+'</div><div style="padding:12px 20px;border-top:1px solid var(--border);background:var(--surface2);display:flex;gap:32px;font-weight:600;font-size:13px"><span>Total: <span class="mono">'+totals.gb.toLocaleString(undefined,{minimumFractionDigits:2})+' GB</span></span><span>Duration: <span class="mono">'+totals.duration+'</span></span></div></div>'; }
function renderOverview() { return '<div class="all-days-grid" id="overviewGrid">'+DAYS.map((d,i)=>'<div class="day-summary-card" data-goto-day="'+i+'"><h3>'+d.label+'</h3><div class="day-date">'+d.dateFormatted+'</div><div class="day-stats"><div><div class="day-stat-label">Data</div><div class="day-stat-value">'+d.totals.gb.toLocaleString()+' GB</div></div><div><div class="day-stat-label">Duration</div><div class="day-stat-value">'+d.totals.duration.substring(0,8)+'</div></div><div><div class="day-stat-label">Rolls</div><div class="day-stat-value">'+d.rolls.filter(r=>!r.isBreak).length+'</div></div></div><div style="margin-top:12px;font-size:12px;color:var(--text-dim)">Drives: '+d.benchmarks.map(b=>b.name).join(", ")+' &bull; '+d.cameras.length+' cameras</div></div>').join('')+'</div>'; }
function renderDay(i) { const d=DAYS[i]; const r=currentLayout==="table"?renderRollsTable(d.rolls,d.totals):renderRollsCards(d.rolls,d.totals); return '<div style="margin-bottom:16px"><h2 style="font-size:20px;font-weight:700">'+d.label+' &mdash; '+d.dateFormatted+'</h2><div style="color:var(--text-dim);font-size:13px;margin-top:4px">'+d.totals.gb.toLocaleString()+' GB &bull; '+d.totals.duration+' &bull; '+d.rolls.filter(r=>!r.isBreak).length+' rolls</div></div>'+renderBenchmarks(d.benchmarks)+renderCameras(d.cameras)+r; }
function render() {
  var el=document.getElementById("content");
  el.innerHTML = currentDay==="overview" ? renderOverview() : renderDay(parseInt(currentDay));
  document.querySelectorAll("[data-goto-day]").forEach(function(card) {
    card.addEventListener("click", function(e) {
      e.preventDefault();
      var idx=parseInt(card.dataset.gotoDay);
      var tabs=document.querySelectorAll(".day-tab");
      if(tabs[idx+1]){currentDay=String(idx);tabs.forEach(function(t){t.classList.toggle("active",t===tabs[idx+1])});render();}
    });
  });
}
render();
</script>
</body>
</html>`;
}

// ===== PRINT HTML (for PDF — all days sequential, no tabs) =====

function renderPrintHTML(project) {
  const maxBench = getMaxBenchmark(project.days);
  const cumulative = computeCumulativeTotals(project.days.map(d => d.totals));

  let daysHTML = project.days.map((d, i) => {
    const cum = cumulative[i];
    return `<div class="day-section">
      <div class="day-divider">
        <h2 style="font-size:20px;font-weight:700">Day ${String(d.day_number).padStart(2, '0')} &mdash; ${formatDate(d.date)}</h2>
        <div style="color:var(--text-dim);font-size:13px;margin-top:4px">
          ${fmtNum(d.totals.gb)} GB &bull; ${d.totals.duration} &bull; ${d.totals.rollCount} rolls
        </div>
      </div>
      ${renderBenchmarks(d.benchmarks, maxBench)}
      ${renderCameras(d.cameras)}
      ${renderRollsTable(d.rolls, d.totals)}
      <div class="cumulative-bar">
        <div><div class="cum-label">Cumulative Data</div><div class="cum-value">${fmtNum(cum.gb)} GB</div></div>
        <div><div class="cum-label">Cumulative Duration</div><div class="cum-value">${cum.duration}</div></div>
      </div>
    </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${esc(project.title)} - DIT Report</title>
<style>${REPORT_CSS}${PRINT_EXTRA_CSS}</style>
</head>
<body>
<div class="container">
  ${renderHeaderHTML(project)}
  ${renderStatsBar(project.totals)}
  ${daysHTML}
  <div class="report-footer">DIT Offload Report &mdash; Generated ${new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}</div>
</div>
</body>
</html>`;
}

export { renderStandaloneHTML, renderPrintHTML };
