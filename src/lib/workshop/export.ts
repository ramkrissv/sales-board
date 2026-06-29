/**
 * Workshop Export — generates rich, data-driven HTML reports.
 * Every chart/infographic is rendered from actual workshop data, not AI text.
 * AI is used ONLY for narrative sections — data representation is code-driven.
 */
import { workshopStats, gapsForWorkshop, levelReadiness, rollupByWorkstream, priorityRank } from './scoring';
import { MATURITY_LABELS as MATURITY, MATURITY_COLORS, EXEC_LABELS } from './constants';

// ═══════ SHARED STYLES ═══════
const SHARED_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',system-ui,sans-serif;color:#1a1a2e;line-height:1.6;background:#fff}
.page{max-width:960px;margin:0 auto;padding:40px 32px}
h1{font-family:'Space Grotesk','Inter',sans-serif;color:#0A867F;font-size:24px;margin-bottom:4px}
h2{font-family:'Space Grotesk','Inter',sans-serif;color:#0B1120;font-size:18px;margin:32px 0 12px;border-bottom:2px solid #e4e7ee;padding-bottom:8px}
h3{color:#333;font-size:15px;margin:20px 0 8px}
.hero{background:linear-gradient(135deg,#0B1120,#1a1a3e);color:#fff;padding:32px;border-radius:16px;margin-bottom:32px}
.hero h1{color:#0FB5AD;border:none;font-size:28px}
.hero .sub{color:rgba(255,255,255,0.5);font-size:13px;margin-top:6px}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin:20px 0}
.kpi{background:#f8f9fa;border:1px solid #e9ecef;border-radius:12px;padding:16px;text-align:center}
.kpi .v{font-size:28px;font-weight:700;font-family:'Space Grotesk',sans-serif}
.kpi .l{font-size:10px;color:#666;text-transform:uppercase;letter-spacing:0.5px;margin-top:2px}
.card{border:1px solid #e9ecef;border-radius:12px;padding:20px;margin:12px 0;page-break-inside:avoid}
.bar-h{height:8px;background:#e9ecef;border-radius:4px;overflow:hidden;margin:4px 0}
.bar-fill{height:100%;border-radius:4px;transition:width .3s}
.tbl{width:100%;border-collapse:collapse;font-size:12px;margin:12px 0}
.tbl th{background:#f5f3ff;color:#7c3aed;padding:8px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #7c3aed20}
.tbl td{padding:7px 12px;border-bottom:1px solid #f0f0f0;vertical-align:top}
.tbl tr:hover td{background:#fafafa}
.chip{display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600}
.sev-crit{background:#C8472E15;color:#C8472E}
.sev-high{background:#D97A2B15;color:#D97A2B}
.sev-med{background:#f59e0b15;color:#f59e0b}
.sev-low{background:#22c55e15;color:#22c55e}
.nav{display:flex;gap:8px;margin:16px 0;flex-wrap:wrap}
.nav a{padding:6px 14px;border-radius:8px;font-size:11px;text-decoration:none;color:#7c3aed;background:#7c3aed10;border:1px solid #7c3aed20}
.nav a:hover{background:#7c3aed20}
details{margin:8px 0}
details summary{cursor:pointer;font-size:13px;font-weight:600;color:#0A867F;padding:8px 0}
details summary:hover{color:#0B1120}
.footer{margin-top:48px;padding-top:16px;border-top:1px solid #e9ecef;font-size:10px;color:#999;text-align:center}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media print{
  .hero{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .bar-fill,.chip,.kpi .v{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  details[open] summary ~ *{display:block!important}
  .nav{display:none}
  h2{page-break-before:auto}
  .card{page-break-inside:avoid}
}
@media(max-width:700px){.two-col{grid-template-columns:1fr}.kpis{grid-template-columns:repeat(2,1fr)}}
`;

function maturityChipHTML(score: number): string {
  return `<span class="chip" style="background:${MATURITY_COLORS[score]}20;color:${MATURITY_COLORS[score]}">${MATURITY[score]}</span>`;
}

function severityChip(gap: number, priority: boolean): string {
  const sev = gap >= 3 || (gap >= 2 && priority) ? 'crit' : gap >= 2 ? 'high' : gap >= 1 && priority ? 'med' : 'low';
  const label = sev === 'crit' ? 'Critical' : sev === 'high' ? 'High' : sev === 'med' ? 'Medium' : 'Low';
  return `<span class="chip sev-${sev}">${label} (Δ${gap})</span>`;
}

function svgDial(value: number, size: number = 120): string {
  const r = size * 0.38;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const color = value < 25 ? '#C3C9D4' : value < 50 ? '#6E97C2' : value < 75 ? '#3A93A0' : '#0A867F';
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="display:block;margin:0 auto">
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="#e9ecef" stroke-width="${size*0.06}"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="${size*0.06}"
      stroke-dasharray="${circ}" stroke-dashoffset="${offset}" stroke-linecap="round" transform="rotate(-90 ${size/2} ${size/2})"
      style="-webkit-print-color-adjust:exact;print-color-adjust:exact"/>
    <text x="${size/2}" y="${size/2-4}" text-anchor="middle" font-size="${size*0.22}" font-weight="700" fill="#0B1120" font-family="Space Grotesk,sans-serif">${value}</text>
    <text x="${size/2}" y="${size/2+14}" text-anchor="middle" font-size="${size*0.08}" fill="#666" text-transform="uppercase" letter-spacing="1">INDEX</text>
  </svg>`;
}

function maturityBarChart(levels: any[]): string {
  const dist = [0,0,0,0,0];
  levels.forEach((l: any) => (l.dimensions || []).forEach((d: any) => { if (d.currentScore != null) dist[d.currentScore]++; }));
  const max = Math.max(...dist, 1);
  return `<div style="display:flex;align-items:flex-end;gap:8px;height:80px;margin:12px 0">
    ${dist.map((c, i) => `<div style="flex:1;text-align:center">
      <div style="font-size:11px;font-weight:700;color:#0B1120;margin-bottom:4px">${c}</div>
      <div style="height:${Math.max((c/max)*60, 3)}px;background:${MATURITY_COLORS[i]};border-radius:4px 4px 0 0;-webkit-print-color-adjust:exact;print-color-adjust:exact"></div>
      <div style="font-size:8px;color:#888;margin-top:4px">${MATURITY[i]}</div>
    </div>`).join('')}
  </div>`;
}

// ═══════ FINDINGS REPORT (multi-section, data-driven) ═══════
export function generateFindingsHTML(workshop: any, options: { recommendations?: string[]; narrative?: string } = {}): string {
  const stats = workshopStats(workshop);
  const gaps = gapsForWorkshop(workshop);
  const levels = workshop.framework?.levels || [];
  const workstreams = workshop.framework?.workstreams || [];
  const useCases = workshop.useCases || [];
  const scopeItems = workshop.scopeItems || [];
  const topGaps = [...gaps].sort((a, b) => b.gap - a.gap || (b.priority ? 1 : 0) - (a.priority ? 1 : 0));
  const criticalGaps = gaps.filter(g => g.gap >= 3 || (g.gap >= 2 && g.priority));
  const rollups = rollupByWorkstream(gaps, workstreams, scopeItems);

  const allDims = levels.flatMap((l: any) => l.dimensions || []);
  const scored = allDims.filter((d: any) => d.currentScore != null);
  const avgMat = scored.length > 0 ? (scored.reduce((s: number, d: any) => s + d.currentScore, 0) / scored.length) : 0;
  const strengths = scored.filter((d: any) => d.currentScore >= 3).sort((a: any, b: any) => b.currentScore - a.currentScore);
  const weaknesses = scored.filter((d: any) => d.currentScore <= 1).sort((a: any, b: any) => a.currentScore - b.currentScore);

  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${workshop.customerName} — Assessment Findings</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
<style>${SHARED_CSS}</style>
</head><body>
<div class="page">

<!-- HERO -->
<div class="hero">
  <div style="display:flex;align-items:center;gap:24px;flex-wrap:wrap">
    ${svgDial(stats.index, 100)}
    <div style="flex:1;min-width:200px">
      <h1>${workshop.customerName}</h1>
      <div class="sub">${workshop.title} · ${stats.stage}</div>
      <div style="display:flex;gap:16px;margin-top:12px;flex-wrap:wrap">
        ${[
          { v: `${avgMat.toFixed(1)}/4`, l: 'Avg Maturity' },
          { v: `${criticalGaps.length}`, l: 'Critical Gaps' },
          { v: `${stats.dimensionsScored}/${stats.totalDimensions}`, l: 'Dimensions' },
          { v: `${useCases.length}`, l: 'Use Cases' },
        ].map(k => `<div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:8px 14px;text-align:center">
          <div style="font-size:16px;font-weight:700;color:#0FB5AD;font-family:'Space Grotesk',sans-serif">${k.v}</div>
          <div style="font-size:8px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.5px">${k.l}</div>
        </div>`).join('')}
      </div>
    </div>
  </div>
</div>

<!-- NAVIGATION -->
<div class="nav">
  <a href="#readiness">Readiness</a>
  <a href="#gaps">Gap Analysis</a>
  <a href="#dimensions">Dimensions</a>
  <a href="#workstreams">Workstreams</a>
  ${options.narrative ? '<a href="#narrative">AI Analysis</a>' : ''}
  ${(options.recommendations || []).length > 0 ? '<a href="#recs">Recommendations</a>' : ''}
</div>

<!-- SECTION: READINESS -->
<h2 id="readiness">Readiness Overview</h2>

<div class="two-col">
  <div class="card">
    <h3>Maturity Distribution</h3>
    ${maturityBarChart(levels)}
    <div style="text-align:center;font-size:12px;color:#666;margin-top:8px">
      Average: <strong style="color:${MATURITY_COLORS[Math.round(avgMat)]}">${avgMat.toFixed(1)} — ${MATURITY[Math.round(avgMat)]}</strong>
    </div>
  </div>
  <div class="card">
    <h3>Gap Severity</h3>
    ${[
      { l: 'Critical', c: criticalGaps.length, color: '#C8472E' },
      { l: 'High', c: gaps.filter(g => g.gap === 2 && !g.priority).length, color: '#D97A2B' },
      { l: 'Medium', c: gaps.filter(g => g.gap === 1 && g.priority).length, color: '#f59e0b' },
      { l: 'Low', c: gaps.filter(g => g.gap === 1 && !g.priority).length, color: '#22c55e' },
    ].map(s => `<div style="display:flex;align-items:center;gap:8px;margin:6px 0">
      <span style="font-size:11px;color:#666;width:50px">${s.l}</span>
      <div style="flex:1;height:6px;background:#e9ecef;border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${gaps.length > 0 ? (s.c / gaps.length) * 100 : 0}%;background:${s.color};border-radius:3px;-webkit-print-color-adjust:exact;print-color-adjust:exact"></div>
      </div>
      <span style="font-size:12px;font-weight:600;color:${s.color};width:20px;text-align:right">${s.c}</span>
    </div>`).join('')}
    <div style="font-size:11px;color:#666;margin-top:8px;text-align:center">${gaps.length} total gaps across ${levels.length} levels</div>
  </div>
</div>

<!-- Level readiness cards -->
${levels.map((level: any, i: number) => {
  const r = levelReadiness(level);
  const dims = level.dimensions || [];
  const levelGaps = gaps.filter(g => g.levelId === level.id);
  const wt = levels.reduce((s: number, l: any) => s + (l.weight || 1), 0);
  return `
<div class="card">
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
    <div style="background:#0B1120;color:#0FB5AD;width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;font-family:'Space Grotesk',sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact">${level.code || `L${i+1}`}</div>
    <div style="flex:1">
      <div style="font-weight:600;font-size:14px">${level.name}</div>
      <div style="font-size:11px;color:#666">${r.scored}/${r.total} scored · Weight ${Math.round((level.weight || 1) / wt * 100)}% · ${levelGaps.length} gaps</div>
    </div>
    <div style="font-size:22px;font-weight:700;color:${MATURITY_COLORS[Math.min(4, Math.round(r.currentPct / 25))]};font-family:'Space Grotesk',sans-serif">${r.currentPct}%</div>
  </div>
  <div class="bar-h"><div class="bar-fill" style="width:${r.currentPct}%;background:${MATURITY_COLORS[Math.min(4, Math.round(r.currentPct / 25))]}"></div></div>
  <details>
    <summary>${dims.length} dimensions — click to expand</summary>
    <table class="tbl" style="margin-top:8px">
      <thead><tr><th>ID</th><th>Dimension</th><th>Current</th><th>Target</th><th>Gap</th><th>Finding</th></tr></thead>
      <tbody>${dims.map((d: any) => {
        const hasGap = d.currentScore != null && d.targetScore != null && d.targetScore > d.currentScore;
        return `<tr>
          <td style="font-family:monospace;font-size:11px;color:#666">${d.id || d.code || ''}</td>
          <td><strong>${d.name}</strong>${d.priority ? ' ⚑' : ''}</td>
          <td>${d.currentScore != null ? maturityChipHTML(d.currentScore) : '<span style="color:#ccc">—</span>'}</td>
          <td>${d.targetScore != null ? maturityChipHTML(d.targetScore) : '<span style="color:#ccc">—</span>'}</td>
          <td>${hasGap ? severityChip(d.targetScore - d.currentScore, !!d.priority) : '<span style="color:#22c55e;font-size:11px">✓</span>'}</td>
          <td style="font-size:11px;color:#555;max-width:250px">${d.finding?.body ? d.finding.body.slice(0, 120) + (d.finding.body.length > 120 ? '...' : '') : '<span style="color:#ccc">—</span>'}</td>
        </tr>`;
      }).join('')}</tbody>
    </table>
  </details>
</div>`;
}).join('')}

<!-- Strengths & Weaknesses -->
<div class="two-col">
  <div class="card">
    <h3 style="color:#22c55e">Strengths (${strengths.length})</h3>
    ${strengths.length === 0 ? '<div style="font-size:12px;color:#999;padding:8px 0">No dimensions at Governed or above</div>' :
    strengths.slice(0, 8).map((d: any) => `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px">
      <div style="width:8px;height:8px;border-radius:4px;background:${MATURITY_COLORS[d.currentScore]};-webkit-print-color-adjust:exact;print-color-adjust:exact"></div>
      <span style="flex:1">${d.name}</span>
      ${maturityChipHTML(d.currentScore)}
    </div>`).join('')}
  </div>
  <div class="card">
    <h3 style="color:#C8472E">Attention Areas (${weaknesses.length})</h3>
    ${weaknesses.length === 0 ? '<div style="font-size:12px;color:#999;padding:8px 0">No dimensions at Ad hoc or below</div>' :
    weaknesses.slice(0, 8).map((d: any) => `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px">
      <div style="width:8px;height:8px;border-radius:4px;background:${MATURITY_COLORS[d.currentScore]};-webkit-print-color-adjust:exact;print-color-adjust:exact"></div>
      <span style="flex:1">${d.name}</span>
      ${maturityChipHTML(d.currentScore)}
    </div>`).join('')}
  </div>
</div>

<!-- SECTION: GAP ANALYSIS -->
<h2 id="gaps">Gap Analysis</h2>
<table class="tbl">
  <thead><tr><th>#</th><th>Dimension</th><th>Current</th><th>Target</th><th>Severity</th><th>Workstream</th><th>Finding</th></tr></thead>
  <tbody>${topGaps.map((g, i) => `<tr>
    <td style="font-size:11px;color:#999">${i + 1}</td>
    <td><strong>${g.dimensionName}</strong>${g.priority ? ' <span style="color:#D97A2B">⚑</span>' : ''}</td>
    <td>${maturityChipHTML(g.current)}</td>
    <td>${maturityChipHTML(g.target)}</td>
    <td>${severityChip(g.gap, g.priority)}</td>
    <td style="font-family:monospace;font-size:11px;color:#7c3aed">${g.workstreamCode || '—'}</td>
    <td style="font-size:11px;color:#555;max-width:200px">${g.finding ? g.finding.slice(0, 100) + '...' : '—'}</td>
  </tr>`).join('')}</tbody>
</table>

<!-- SECTION: WORKSTREAM IMPACT -->
<h2 id="workstreams">Workstream Impact</h2>
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px">
  ${rollups.map(ws => `<div class="card">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <span style="font-family:monospace;font-weight:700;color:#7c3aed;font-size:13px">${ws.code}</span>
      <span style="font-weight:600;font-size:13px;flex:1">${ws.name}</span>
      <span style="font-size:11px;color:#666">${ws.gaps.length} gaps · ${ws.totalEffort} pts</span>
    </div>
    ${ws.gaps.slice(0, 4).map(g => `<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:11px">
      <div style="width:6px;height:6px;border-radius:3px;background:${g.gap >= 3 ? '#C8472E' : g.gap >= 2 ? '#D97A2B' : '#f59e0b'};-webkit-print-color-adjust:exact;print-color-adjust:exact"></div>
      <span style="flex:1">${g.dimensionName}</span>
      <span style="font-family:monospace;color:#888">${MATURITY[g.current].slice(0,3)}→${MATURITY[g.target].slice(0,3)}</span>
    </div>`).join('')}
    ${ws.gaps.length > 4 ? `<div style="font-size:10px;color:#999;padding-left:12px">+${ws.gaps.length - 4} more</div>` : ''}
  </div>`).join('')}
</div>

<!-- SECTION: AI NARRATIVE -->
${options.narrative ? `
<h2 id="narrative">AI Current-State Assessment</h2>
<div style="background:#f8fffe;border-left:4px solid #0A867F;padding:20px;border-radius:0 12px 12px 0;font-size:13px;line-height:1.8">
  ${options.narrative.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}
</div>
` : ''}

<!-- SECTION: RECOMMENDATIONS -->
${(options.recommendations || []).length > 0 ? `
<h2 id="recs">Recommendations</h2>
${(options.recommendations || []).map((rec: any, i: number) => {
  const text = typeof rec === 'string' ? rec : rec.text || '';
  const cat = typeof rec === 'object' ? rec.category : '';
  const catColors: Record<string, string> = { quick_wins: '#22c55e', foundation: '#3b82f6', strategic: '#7c3aed', governance: '#0A867F' };
  const catLabels: Record<string, string> = { quick_wins: 'Quick Win', foundation: 'Foundation', strategic: 'Strategic', governance: 'Governance' };
  return `<div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid #f0f0f0">
    <div style="width:24px;height:24px;border-radius:12px;background:${catColors[cat] || '#7c3aed'};color:white;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;-webkit-print-color-adjust:exact;print-color-adjust:exact">${i + 1}</div>
    <div style="flex:1">
      ${cat ? `<span class="chip" style="background:${catColors[cat]}15;color:${catColors[cat]};margin-bottom:4px">${catLabels[cat] || cat}</span> ` : ''}
      <div style="font-size:13px">${text}</div>
      ${typeof rec === 'object' && rec.impact ? `<div style="font-size:11px;color:#666;margin-top:4px"><strong>Impact:</strong> ${rec.impact}</div>` : ''}
    </div>
  </div>`;
}).join('')}
` : ''}

<!-- USE CASES -->
${useCases.length > 0 ? `
<h2>Use Case Portfolio (${useCases.length})</h2>
<table class="tbl">
  <thead><tr><th>#</th><th>Use Case</th><th>Sponsor</th><th>Value</th><th>Feasibility</th><th>Pilot</th></tr></thead>
  <tbody>${useCases.map((uc: any, i: number) => `<tr>
    <td>${i + 1}</td>
    <td><strong>${uc.name}</strong>${uc.problem ? `<div style="font-size:10px;color:#666">${uc.problem.slice(0, 80)}</div>` : ''}</td>
    <td style="font-size:11px">${uc.sponsor || '—'}</td>
    <td style="text-align:center;font-weight:600;color:${uc.value >= 4 ? '#0A867F' : '#666'}">${uc.value}/5</td>
    <td style="text-align:center;font-weight:600;color:${uc.feasibility >= 4 ? '#0A867F' : '#666'}">${uc.feasibility}/5</td>
    <td style="text-align:center">${uc.isPilot ? '<span style="color:#f59e0b;font-weight:700">★</span>' : ''}</td>
  </tr>`).join('')}</tbody>
</table>
` : ''}

<div class="footer">
  ${workshop.customerName} — Assessment Findings · ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} · Galent SalesPilot · Confidential
</div>
</div>
</body></html>`;
}

// ═══════ PROPOSAL REPORT ═══════
export function generateProposalHTML(workshop: any, proposal: any): string {
  const stats = workshopStats(workshop);
  const gaps = gapsForWorkshop(workshop);
  const workstreams = workshop.framework?.workstreams || [];
  const scopeItems = workshop.scopeItems || [];
  const rollups = rollupByWorkstream(gaps, workstreams, scopeItems);

  const modules = proposal.modules || [];
  const totalEffort = modules.reduce((s: number, m: any) => s + (m.effort || 0), 0);

  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${proposal.title || workshop.customerName + ' — Proposal'}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
<style>${SHARED_CSS}</style>
</head><body>
<div class="page">

<div class="hero">
  <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,0.4);margin-bottom:8px">Commercial Proposal</div>
  <h1>${proposal.title || workshop.customerName + ' — Engagement Proposal'}</h1>
  <div class="sub">${workshop.customerName} · Readiness ${stats.index}/100 (${stats.stage})</div>
  <div style="display:flex;gap:12px;margin-top:16px;flex-wrap:wrap">
    ${[
      { v: modules.length, l: 'Workstreams' },
      { v: `${totalEffort} pts`, l: 'Total Effort' },
      { v: modules.filter((m: any) => m.phase === 'P1').length, l: 'Phase 1' },
      { v: stats.gapCount, l: 'Gaps Addressed' },
    ].map(k => `<div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:8px 14px;text-align:center">
      <div style="font-size:16px;font-weight:700;color:#0FB5AD;font-family:'Space Grotesk',sans-serif">${k.v}</div>
      <div style="font-size:8px;color:rgba(255,255,255,0.4);text-transform:uppercase">${k.l}</div>
    </div>`).join('')}
  </div>
</div>

<!-- Investment bar -->
${modules.length > 0 ? `
<div class="card">
  <h3>Investment at a Glance</h3>
  <div style="display:flex;height:28px;border-radius:8px;overflow:hidden;margin:12px 0">
    ${modules.map((m: any, i: number) => {
      const pct = totalEffort > 0 ? (m.effort || 0) / totalEffort * 100 : 0;
      const colors = ['#7c3aed', '#3b82f6', '#0A867F', '#f59e0b', '#C8472E', '#22c55e', '#6E97C2', '#D97A2B'];
      return pct > 0 ? `<div style="width:${pct}%;background:${colors[i % colors.length]};display:flex;align-items:center;justify-content:center;-webkit-print-color-adjust:exact;print-color-adjust:exact">
        <span style="font-size:8px;font-weight:700;color:white">${m.workstreamCode || ''}</span>
      </div>` : '';
    }).join('')}
  </div>
  <div style="display:flex;gap:12px;flex-wrap:wrap">
    ${modules.map((m: any, i: number) => {
      const colors = ['#7c3aed', '#3b82f6', '#0A867F', '#f59e0b', '#C8472E', '#22c55e', '#6E97C2', '#D97A2B'];
      return `<span style="font-size:10px;display:flex;align-items:center;gap:4px">
        <span style="width:8px;height:8px;border-radius:4px;background:${colors[i % colors.length]};-webkit-print-color-adjust:exact;print-color-adjust:exact"></span>
        ${m.workstreamCode}: ${m.effort || 0} pts
      </span>`;
    }).join('')}
  </div>
</div>` : ''}

${proposal.execSummary ? `<h2>Executive Summary</h2><div style="font-size:14px;line-height:1.8">${proposal.execSummary.replace(/\n/g, '<br>')}</div>` : ''}

<h2>Workstream Modules</h2>
${modules.map((mod: any) => {
  const wsGaps = gaps.filter(g => g.workstreamCode === mod.workstreamCode);
  return `
<div class="card">
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
    <div style="background:#0B1120;color:white;padding:4px 10px;border-radius:6px;font-family:monospace;font-size:12px;font-weight:700;-webkit-print-color-adjust:exact;print-color-adjust:exact">${mod.workstreamCode || ''}</div>
    <div style="flex:1">
      <div style="font-weight:600;font-size:14px">${mod.workstreamName || ''}</div>
      <div style="font-size:11px;color:#666">${mod.objective || ''}</div>
    </div>
    ${mod.executionModel ? `<span style="background:#7c3aed15;color:#7c3aed;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;-webkit-print-color-adjust:exact;print-color-adjust:exact">${EXEC_LABELS[mod.executionModel] || mod.executionModel}</span>` : ''}
    <div style="font-size:14px;font-weight:700;color:#0A867F">${mod.effort || 0} pts · ${mod.phase || 'P1'}</div>
  </div>
  ${mod.currentState ? `<div style="margin-bottom:8px"><span style="font-size:10px;text-transform:uppercase;color:#D97A2B;font-weight:600">Current State</span><p style="font-size:13px;margin-top:4px">${mod.currentState}</p></div>` : ''}
  ${mod.recommendation ? `<div style="margin-bottom:8px"><span style="font-size:10px;text-transform:uppercase;color:#0A867F;font-weight:600">Recommendation</span><p style="font-size:13px;margin-top:4px">${mod.recommendation}</p></div>` : ''}
  ${(mod.scopeItems || []).length > 0 ? `<div style="margin-top:8px">${mod.scopeItems.map((item: string) => `<div style="padding-left:16px;position:relative;margin:4px 0;font-size:12px"><span style="position:absolute;left:2px;top:6px;width:6px;height:6px;border-radius:3px;background:#0A867F;-webkit-print-color-adjust:exact;print-color-adjust:exact"></span>${item}</div>`).join('')}</div>` : ''}
  ${mod.rationale ? `<div style="margin-top:12px;padding-top:8px;border-top:1px solid #f0f0f0;font-size:12px;color:#666;font-style:italic"><strong>So What:</strong> ${mod.rationale}</div>` : ''}
  ${wsGaps.length > 0 ? `<details style="margin-top:8px"><summary style="font-size:11px">Source dimensions (${wsGaps.length})</summary>
    <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">${wsGaps.map(g => `<span style="font-size:9px;padding:2px 6px;border-radius:4px;background:#f5f3ff;color:#7c3aed">${g.dimensionId} ${g.dimensionName} (+${g.gap})</span>`).join('')}</div>
  </details>` : ''}
</div>`;
}).join('')}

${proposal.investmentSummary ? `<div class="card" style="background:#f8fffe;border-color:#0A867F30"><h3 style="color:#0A867F">Investment Summary</h3><p style="font-size:13px;margin-top:8px">${proposal.investmentSummary}</p></div>` : ''}

${(proposal.nextSteps || []).length > 0 ? `<h2>Next Steps</h2><ol style="padding-left:20px">${proposal.nextSteps.map((s: string) => `<li style="font-size:13px;margin:6px 0">${s}</li>`).join('')}</ol>` : ''}

<div class="footer">
  ${workshop.customerName} — Commercial Proposal · ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} · Galent SalesPilot · Confidential
</div>
</div>
</body></html>`;
}
