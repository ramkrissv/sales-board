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

// ═══════ ASSESSMENT REPORT (comprehensive 10+ section) ═══════
export function generateAssessmentReportHTML(workshop: any, narrative?: string): string {
  const stats = workshopStats(workshop);
  const gaps = gapsForWorkshop(workshop);
  const levels = workshop.framework?.levels || [];
  const workstreams = workshop.framework?.workstreams || [];
  const useCases = workshop.useCases || [];
  const scopeItems = workshop.scopeItems || [];
  const rollups = rollupByWorkstream(gaps, workstreams, scopeItems);
  const topGaps = [...gaps].sort((a, b) => b.gap - a.gap || (b.priority ? 1 : 0) - (a.priority ? 1 : 0));
  const criticalGaps = gaps.filter(g => g.gap >= 3 || (g.gap >= 2 && g.priority));
  const highGaps = gaps.filter(g => g.gap === 2 && !g.priority);
  const allDims = levels.flatMap((l: any) => l.dimensions || []);
  const scored = allDims.filter((d: any) => d.currentScore != null);
  const avgMat = scored.length > 0 ? scored.reduce((s: number, d: any) => s + d.currentScore, 0) / scored.length : 0;
  const strengths = scored.filter((d: any) => d.currentScore >= 3).sort((a: any, b: any) => b.currentScore - a.currentScore);
  const totalWt = levels.reduce((s: number, l: any) => s + (l.weight || 1), 0);
  const totalEffort = scopeItems.reduce((s: number, si: any) => s + (si.effort || 0), 0);
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const tocItems = [
    { id: 'exec-summary', label: 'Executive Summary' },
    { id: 'methodology', label: 'Methodology' },
    ...levels.map((l: any, i: number) => ({ id: `level-${i}`, label: `${l.code || `L${i+1}`} ${l.name}` })),
    { id: 'themes', label: 'Cross-Cutting Themes' },
    { id: 'strengths', label: 'Strengths Inventory' },
    { id: 'risks', label: 'Risk Register' },
    { id: 'usecases', label: 'Use Case Portfolio' },
    { id: 'scope', label: 'Scope & Investment' },
    { id: 'appendix', label: 'Appendix' },
  ];

  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${workshop.customerName} — Comprehensive Assessment Report</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
<style>${SHARED_CSS}
.toc{columns:2;gap:24px;margin:16px 0}
.toc a{display:block;padding:6px 0;font-size:12px;color:#333;text-decoration:none;border-bottom:1px dotted #e4e7ee}
.toc a:hover{color:#0A867F}
.toc a .num{color:#0A867F;font-weight:700;font-family:'Space Grotesk',sans-serif;margin-right:8px}
.metric-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:16px 0}
.metric-card{background:#f8f9fa;border:1px solid #e9ecef;border-radius:10px;padding:16px}
.metric-card .val{font-size:24px;font-weight:700;font-family:'Space Grotesk',sans-serif}
.metric-card .lbl{font-size:10px;color:#666;text-transform:uppercase;letter-spacing:0.5px;margin-top:2px}
.risk-card{border-left:4px solid;padding:16px;border-radius:0 10px 10px 0;margin:10px 0;background:#fafafa}
.level-header{display:flex;align-items:center;gap:16px;margin:24px 0 12px}
.level-badge{background:#0B1120;color:#0FB5AD;width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:18px;font-family:'Space Grotesk',sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
</style>
</head><body>
<div class="page">

<!-- HERO -->
<div class="hero">
  <div style="display:flex;align-items:center;gap:28px;flex-wrap:wrap">
    ${svgDial(stats.index, 120)}
    <div style="flex:1;min-width:220px">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.35);margin-bottom:6px">Comprehensive Assessment Report</div>
      <h1>${workshop.customerName}</h1>
      <div class="sub">${workshop.title} · ${stats.stage} · ${date}</div>
      <div class="kpis" style="margin-top:16px">
        ${[
          { v: stats.index, l: 'Readiness Index', c: '#0FB5AD' },
          { v: `${avgMat.toFixed(1)}/4`, l: 'Avg Maturity', c: MATURITY_COLORS[Math.round(avgMat)] },
          { v: criticalGaps.length, l: 'Critical Gaps', c: criticalGaps.length > 0 ? '#C8472E' : '#22c55e' },
          { v: `${stats.dimensionsScored}/${stats.totalDimensions}`, l: 'Scored', c: '#fff' },
          { v: useCases.length, l: 'Use Cases', c: '#fff' },
          { v: `${totalEffort} pts`, l: 'Total Effort', c: '#fff' },
        ].map(k => `<div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:8px 12px;text-align:center">
          <div style="font-size:18px;font-weight:700;color:${k.c};font-family:'Space Grotesk',sans-serif">${k.v}</div>
          <div style="font-size:8px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.5px">${k.l}</div>
        </div>`).join('')}
      </div>
    </div>
  </div>
</div>

<!-- TABLE OF CONTENTS -->
<h2>Table of Contents</h2>
<div class="toc">
  ${tocItems.map((t, i) => `<a href="#${t.id}"><span class="num">${i + 1}.</span>${t.label}</a>`).join('')}
</div>

<!-- NAV -->
<div class="nav">
  ${tocItems.map(t => `<a href="#${t.id}">${t.label}</a>`).join('')}
</div>

<!-- EXECUTIVE SUMMARY -->
<h2 id="exec-summary">1. Executive Summary</h2>
<div class="card">
  <p style="font-size:14px;line-height:1.8;margin-bottom:16px">
    This assessment evaluated <strong>${stats.totalDimensions} dimensions</strong> across <strong>${levels.length} levels</strong> for ${workshop.customerName}.
    The overall readiness index stands at <strong>${stats.index}/100 (${stats.stage})</strong>, with an average maturity of
    <strong>${avgMat.toFixed(1)}/4 (${MATURITY[Math.round(avgMat)]})</strong>.
    ${criticalGaps.length > 0 ? `There are <strong>${criticalGaps.length} critical gaps</strong> requiring immediate attention.` : 'No critical gaps were identified.'}
    ${useCases.length > 0 ? `${useCases.length} use cases have been catalogued, with ${useCases.filter((u: any) => u.isPilot).length} recommended as pilots.` : ''}
  </p>
  ${narrative ? `<div style="background:#f8fffe;border-left:4px solid #0A867F;padding:16px;border-radius:0 8px 8px 0;font-size:13px;line-height:1.7">${narrative.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</div>` : ''}
  <div class="metric-grid">
    ${levels.map((l: any, i: number) => {
      const r = levelReadiness(l);
      return `<div class="metric-card">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span style="font-family:monospace;font-weight:700;color:#0A867F;font-size:12px">${l.code || `L${i+1}`}</span>
          <span style="font-size:12px;font-weight:600">${l.name}</span>
        </div>
        <div class="val" style="color:${MATURITY_COLORS[Math.min(4, Math.round(r.currentPct / 25))]}">${r.currentPct}%</div>
        <div class="lbl">${r.scored}/${r.total} scored · Wt ${Math.round(((l.weight || 1) / totalWt) * 100)}%</div>
        <div class="bar-h" style="margin-top:6px"><div class="bar-fill" style="width:${r.currentPct}%;background:${MATURITY_COLORS[Math.min(4, Math.round(r.currentPct / 25))]}"></div></div>
        ${r.targetPct > 0 ? `<div style="font-size:10px;color:#888;margin-top:4px">Target: ${r.targetPct}%</div>` : ''}
      </div>`;
    }).join('')}
  </div>
</div>

<!-- METHODOLOGY -->
<h2 id="methodology">2. Methodology</h2>
<div class="card">
  <p style="font-size:13px;margin-bottom:12px">Each dimension is assessed on a <strong>5-point maturity scale (0-4)</strong> with current and target scores. The readiness index is a weighted average across levels.</p>
  <table class="tbl">
    <thead><tr><th>Score</th><th>Label</th><th>Description</th><th>Visual</th></tr></thead>
    <tbody>
      ${MATURITY.map((label, i) => {
        const descs = ['No capability exists', 'Informal, person-dependent', 'Documented, consistent process', 'Managed with metrics and controls', 'Continuously improving, industry-leading'];
        return `<tr>
          <td style="font-weight:700;font-family:monospace;text-align:center">${i}</td>
          <td>${maturityChipHTML(i)}</td>
          <td style="font-size:12px">${descs[i]}</td>
          <td><div style="width:${(i/4)*100}%;height:6px;background:${MATURITY_COLORS[i]};border-radius:3px;min-width:4px;-webkit-print-color-adjust:exact;print-color-adjust:exact"></div></td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>
  <div style="margin-top:12px;font-size:12px;color:#666">
    <strong>Weight distribution:</strong> ${levels.map((l: any, i: number) => `${l.code || `L${i+1}`} ${l.name}: ${Math.round(((l.weight || 1) / totalWt) * 100)}%`).join(' · ')}
  </div>
</div>

<!-- PER-LEVEL DEEP DIVE -->
${levels.map((level: any, li: number) => {
  const r = levelReadiness(level);
  const dims = level.dimensions || [];
  const levelGaps = gaps.filter(g => g.levelId === level.id);
  const levelStrengths = dims.filter((d: any) => d.currentScore != null && d.currentScore >= 3);
  const levelWeaknesses = dims.filter((d: any) => d.currentScore != null && d.currentScore <= 1);
  const levelAvg = dims.filter((d: any) => d.currentScore != null).length > 0
    ? dims.filter((d: any) => d.currentScore != null).reduce((s: number, d: any) => s + d.currentScore, 0) / dims.filter((d: any) => d.currentScore != null).length
    : 0;
  return `
<h2 id="level-${li}">${li + 3}. ${level.code || `L${li+1}`} — ${level.name}</h2>
<div class="level-header">
  <div class="level-badge">${level.code || `L${li+1}`}</div>
  <div style="flex:1">
    <div style="font-size:16px;font-weight:700">${level.name}</div>
    <div style="font-size:12px;color:#666">${level.summary || `${r.scored} of ${r.total} dimensions scored · ${levelGaps.length} gaps identified`}</div>
  </div>
  <div style="text-align:right">
    <div style="font-size:28px;font-weight:700;color:${MATURITY_COLORS[Math.min(4, Math.round(r.currentPct / 25))]};font-family:'Space Grotesk',sans-serif">${r.currentPct}%</div>
    <div style="font-size:10px;color:#888">Readiness</div>
  </div>
</div>

<div class="two-col">
  <div class="card">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <span style="font-size:12px;font-weight:600">Level Stats</span>
      <span style="font-size:11px;color:#888">Avg: ${levelAvg.toFixed(1)}/4</span>
    </div>
    <div class="bar-h" style="height:12px"><div class="bar-fill" style="width:${r.currentPct}%;background:${MATURITY_COLORS[Math.min(4, Math.round(r.currentPct / 25))]}"></div></div>
    ${r.targetPct > 0 ? `<div style="margin-top:4px"><div class="bar-h" style="height:6px"><div class="bar-fill" style="width:${r.targetPct}%;background:#D97A2B;opacity:0.5"></div></div><div style="font-size:9px;color:#D97A2B;text-align:right">Target ${r.targetPct}%</div></div>` : ''}
    <div style="display:flex;gap:16px;margin-top:12px;font-size:11px">
      <span style="color:#22c55e">&#9679; ${levelStrengths.length} strong</span>
      <span style="color:#C8472E">&#9679; ${levelWeaknesses.length} weak</span>
      <span style="color:#f59e0b">&#9679; ${levelGaps.length} gaps</span>
    </div>
  </div>
  <div class="card">
    ${maturityBarChart([level])}
    <div style="text-align:center;font-size:10px;color:#888">Maturity distribution for ${level.name}</div>
  </div>
</div>

<table class="tbl">
  <thead><tr><th style="width:50px">ID</th><th>Dimension</th><th>Probe</th><th>Current</th><th>Target</th><th>Gap</th><th>Finding</th></tr></thead>
  <tbody>${dims.map((d: any) => {
    const hasGap = d.currentScore != null && d.targetScore != null && d.targetScore > d.currentScore;
    return `<tr>
      <td style="font-family:monospace;font-size:11px;color:#666">${d.code || d.id || ''}</td>
      <td><strong>${d.name}</strong>${d.priority ? ' <span style="color:#D97A2B;font-size:10px">PRIORITY</span>' : ''}</td>
      <td style="font-size:11px;color:#777;max-width:180px;font-style:italic">${d.probe || '—'}</td>
      <td>${d.currentScore != null ? maturityChipHTML(d.currentScore) : '<span style="color:#ccc">—</span>'}</td>
      <td>${d.targetScore != null ? maturityChipHTML(d.targetScore) : '<span style="color:#ccc">—</span>'}</td>
      <td>${hasGap ? severityChip(d.targetScore - d.currentScore, !!d.priority) : (d.currentScore != null ? '<span style="color:#22c55e;font-size:11px">On Target</span>' : '')}</td>
      <td style="font-size:11px;color:#555;max-width:220px">${d.finding?.body ? d.finding.body.slice(0, 150) + (d.finding.body.length > 150 ? '...' : '') : '<span style="color:#ccc">No finding recorded</span>'}</td>
    </tr>`;
  }).join('')}</tbody>
</table>

<div style="margin:12px 0;padding:12px 16px;background:#f8f9fa;border-radius:8px;font-size:12px;color:#555;line-height:1.7">
  <strong>${level.code || `L${li+1}`} Summary:</strong>
  ${r.scored > 0 ? `This level achieved ${r.currentPct}% readiness with ${levelStrengths.length} dimension${levelStrengths.length !== 1 ? 's' : ''} at Governed or above.` : 'This level has not been scored yet.'}
  ${levelGaps.length > 0 ? ` ${levelGaps.length} gap${levelGaps.length !== 1 ? 's' : ''} were identified, including ${levelGaps.filter(g => g.gap >= 3 || (g.gap >= 2 && g.priority)).length} at critical severity.` : ''}
  ${r.targetPct > 0 ? ` Target readiness is ${r.targetPct}%, requiring a ${r.targetPct - r.currentPct} percentage point improvement.` : ''}
</div>
`;
}).join('')}

<!-- CROSS-CUTTING THEMES -->
<h2 id="themes">${levels.length + 3}. Cross-Cutting Themes</h2>
<div class="card">
  ${(() => {
    const wsImpact = rollups.sort((a, b) => b.gaps.length - a.gaps.length);
    const multiLevelGapDims = allDims.filter((d: any) => d.currentScore != null && d.targetScore != null && d.targetScore - d.currentScore >= 2);
    const avgGapSize = gaps.length > 0 ? (gaps.reduce((s, g) => s + g.gap, 0) / gaps.length).toFixed(1) : '0';
    return `
    <div style="margin-bottom:16px">
      <h3>Pattern Analysis</h3>
      <div style="font-size:13px;line-height:1.7;margin-top:8px">
        ${gaps.length > 0 ? `<p>Across ${levels.length} assessment levels, <strong>${gaps.length} maturity gaps</strong> were identified with an average gap size of <strong>${avgGapSize} levels</strong>.</p>` : '<p>No gaps identified across the assessment.</p>'}
        ${criticalGaps.length > 0 ? `<p style="margin-top:8px"><strong>Critical concentration:</strong> ${criticalGaps.length} critical gap${criticalGaps.length !== 1 ? 's' : ''} suggest${criticalGaps.length === 1 ? 's' : ''} systemic underinvestment in ${[...new Set(criticalGaps.map(g => g.workstreamCode))].filter(Boolean).join(', ') || 'multiple areas'}.</p>` : ''}
        ${multiLevelGapDims.length > 0 ? `<p style="margin-top:8px"><strong>Deep gaps (&#916; &#8805; 2):</strong> ${multiLevelGapDims.map((d: any) => d.name).join(', ')}. These require structural change, not incremental improvement.</p>` : ''}
      </div>
    </div>
    ${wsImpact.length > 0 ? `
    <h3>Most Impacted Workstreams</h3>
    <div style="margin-top:8px">
      ${wsImpact.slice(0, 5).map(ws => `<div style="display:flex;align-items:center;gap:8px;margin:6px 0">
        <span style="font-family:monospace;font-weight:700;color:#7c3aed;font-size:11px;width:36px">${ws.code}</span>
        <div style="flex:1;height:8px;background:#e9ecef;border-radius:4px;overflow:hidden">
          <div style="height:100%;width:${gaps.length > 0 ? (ws.gaps.length / gaps.length) * 100 : 0}%;background:#7c3aed;border-radius:4px;-webkit-print-color-adjust:exact;print-color-adjust:exact"></div>
        </div>
        <span style="font-size:11px;font-weight:600;width:60px;text-align:right">${ws.gaps.length} gaps</span>
      </div>`).join('')}
    </div>` : ''}`;
  })()}
</div>

<!-- STRENGTHS INVENTORY -->
<h2 id="strengths">${levels.length + 4}. Strengths Inventory</h2>
${strengths.length === 0 ? '<div class="card"><p style="font-size:13px;color:#888">No dimensions scored at Governed (3) or above.</p></div>' : `
<div class="card">
  <p style="font-size:12px;color:#666;margin-bottom:12px">${strengths.length} dimension${strengths.length !== 1 ? 's' : ''} demonstrate strong maturity (Governed or Optimized).</p>
  <table class="tbl">
    <thead><tr><th>Dimension</th><th>Level</th><th>Maturity</th><th>Finding</th></tr></thead>
    <tbody>${strengths.map((d: any) => {
      const parentLevel = levels.find((l: any) => (l.dimensions || []).some((dim: any) => dim.id === d.id || dim.name === d.name));
      return `<tr>
        <td><strong>${d.name}</strong></td>
        <td style="font-size:11px;color:#666">${parentLevel ? (parentLevel.code || parentLevel.name) : '—'}</td>
        <td>${maturityChipHTML(d.currentScore)}</td>
        <td style="font-size:11px;color:#555;max-width:300px">${d.finding?.body ? d.finding.body.slice(0, 120) + '...' : '—'}</td>
      </tr>`;
    }).join('')}</tbody>
  </table>
</div>`}

<!-- RISK REGISTER -->
<h2 id="risks">${levels.length + 5}. Risk Register</h2>
${criticalGaps.length === 0 && highGaps.length === 0 ? '<div class="card"><p style="font-size:13px;color:#888">No high or critical gaps identified.</p></div>' : `
<p style="font-size:12px;color:#666;margin-bottom:12px">${criticalGaps.length + highGaps.length} risk${criticalGaps.length + highGaps.length !== 1 ? 's' : ''} identified from gap analysis.</p>
${[...criticalGaps, ...highGaps].map((g, i) => {
  const isCrit = g.gap >= 3 || (g.gap >= 2 && g.priority);
  return `<div class="risk-card" style="border-color:${isCrit ? '#C8472E' : '#D97A2B'}">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
      <span style="font-size:11px;font-weight:700;color:#888">R${i + 1}</span>
      <strong style="flex:1;font-size:14px">${g.dimensionName}</strong>
      ${severityChip(g.gap, g.priority)}
    </div>
    <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:12px;margin-bottom:8px">
      <span><strong>Current:</strong> ${maturityChipHTML(g.current)}</span>
      <span><strong>Target:</strong> ${maturityChipHTML(g.target)}</span>
      <span style="font-family:monospace;color:#7c3aed">${g.workstreamCode || '—'}</span>
    </div>
    <div style="font-size:12px;color:#555;margin-bottom:6px"><strong>Impact:</strong> ${g.finding || `A ${g.gap}-level maturity gap in ${g.dimensionName} indicates significant risk to transformation objectives.`}</div>
    <div style="font-size:12px;color:#0A867F"><strong>Action:</strong> Advance from ${MATURITY[g.current]} to ${MATURITY[g.target]} through targeted investment in ${g.workstreamCode || 'the relevant workstream'}.</div>
  </div>`;
}).join('')}`}

<!-- USE CASE PORTFOLIO -->
<h2 id="usecases">${levels.length + 6}. Use Case Portfolio</h2>
${useCases.length === 0 ? '<div class="card"><p style="font-size:13px;color:#888">No use cases captured.</p></div>' : `
<div class="card">
  <div style="display:flex;gap:16px;margin-bottom:12px;flex-wrap:wrap">
    <div style="font-size:13px"><strong>${useCases.length}</strong> use cases</div>
    <div style="font-size:13px"><strong>${useCases.filter((u: any) => u.isPilot).length}</strong> pilots</div>
    <div style="font-size:13px">Avg value: <strong>${(useCases.reduce((s: number, u: any) => s + (u.value || 0), 0) / useCases.length).toFixed(1)}/5</strong></div>
    <div style="font-size:13px">Avg feasibility: <strong>${(useCases.reduce((s: number, u: any) => s + (u.feasibility || 0), 0) / useCases.length).toFixed(1)}/5</strong></div>
  </div>
  <table class="tbl">
    <thead><tr><th>#</th><th>Use Case</th><th>Sponsor</th><th>Problem</th><th>Value</th><th>Feasibility</th><th>Quadrant</th><th>Pilot</th></tr></thead>
    <tbody>${useCases.map((uc: any, i: number) => {
      const q = uc.value >= 3 && uc.feasibility >= 3 ? 'Quick Win' : uc.value >= 3 ? 'Strategic' : uc.feasibility >= 3 ? 'Low Priority' : 'Deprioritize';
      const qColor = q === 'Quick Win' ? '#22c55e' : q === 'Strategic' ? '#7c3aed' : q === 'Low Priority' ? '#f59e0b' : '#999';
      return `<tr>
        <td>${i + 1}</td>
        <td><strong>${uc.name}</strong></td>
        <td style="font-size:11px">${uc.sponsor || '—'}</td>
        <td style="font-size:11px;max-width:180px">${uc.problem ? uc.problem.slice(0, 80) + (uc.problem.length > 80 ? '...' : '') : '—'}</td>
        <td style="text-align:center;font-weight:600">${uc.value || 0}/5</td>
        <td style="text-align:center;font-weight:600">${uc.feasibility || 0}/5</td>
        <td><span class="chip" style="background:${qColor}15;color:${qColor}">${q}</span></td>
        <td style="text-align:center">${uc.isPilot ? '<span style="color:#f59e0b;font-weight:700">&#9733;</span>' : ''}</td>
      </tr>`;
    }).join('')}</tbody>
  </table>
</div>`}

<!-- SCOPE & INVESTMENT -->
<h2 id="scope">${levels.length + 7}. Scope & Investment</h2>
<div class="card">
  <div class="kpis">
    <div class="kpi"><div class="v" style="color:#7c3aed">${scopeItems.length}</div><div class="l">Scope Items</div></div>
    <div class="kpi"><div class="v" style="color:#0A867F">${totalEffort}</div><div class="l">Effort Points</div></div>
    <div class="kpi"><div class="v">${rollups.length}</div><div class="l">Workstreams</div></div>
    <div class="kpi"><div class="v">${[...new Set(scopeItems.map((s: any) => s.phase || 'P1'))].length}</div><div class="l">Phases</div></div>
  </div>
  ${rollups.length > 0 ? `
  <table class="tbl" style="margin-top:16px">
    <thead><tr><th>Workstream</th><th>Gaps</th><th>Effort</th><th>Phases</th></tr></thead>
    <tbody>${rollups.map(ws => `<tr>
      <td><span style="font-family:monospace;font-weight:700;color:#7c3aed;margin-right:6px">${ws.code}</span>${ws.name}</td>
      <td style="text-align:center">${ws.gaps.length}</td>
      <td style="text-align:center;font-weight:600">${ws.totalEffort} pts</td>
      <td>${ws.phases.map(p => `<span class="chip" style="background:#3b82f615;color:#3b82f6">${p}</span>`).join(' ')}</td>
    </tr>`).join('')}</tbody>
  </table>` : '<p style="font-size:12px;color:#888">No scope items generated yet.</p>'}
</div>

<!-- APPENDIX -->
<h2 id="appendix">${levels.length + 8}. Appendix</h2>
<details>
  <summary>Scoring Methodology</summary>
  <div style="padding:12px 0;font-size:12px;line-height:1.7">
    <p>The readiness index (0-100) is calculated as the weighted average of level readiness percentages. Each level's readiness is the mean of its scored dimension current values divided by the maximum scale (4), expressed as a percentage.</p>
    <p style="margin-top:8px"><strong>Formula:</strong> Index = &#931;(Level Readiness % x Normalized Weight) / &#931;(Weights of scored levels)</p>
    <p style="margin-top:8px"><strong>Severity classification:</strong> Critical = gap &#8805; 3 or (gap &#8805; 2 + priority flag) · High = gap = 2 · Medium = gap = 1 + priority · Low = gap = 1</p>
  </div>
</details>
<details>
  <summary>Maturity Scale Definitions</summary>
  <div style="padding:12px 0">
    ${MATURITY.map((label, i) => `<div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid #f0f0f0">
      <div style="width:32px;height:32px;border-radius:8px;background:${MATURITY_COLORS[i]};display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:14px;-webkit-print-color-adjust:exact;print-color-adjust:exact">${i}</div>
      <div style="flex:1"><strong>${label}</strong></div>
    </div>`).join('')}
  </div>
</details>
<details>
  <summary>Full Dimension Listing (${allDims.length})</summary>
  <table class="tbl" style="margin-top:8px">
    <thead><tr><th>Level</th><th>ID</th><th>Dimension</th><th>Workstream</th><th>Current</th><th>Target</th></tr></thead>
    <tbody>${levels.flatMap((l: any) => (l.dimensions || []).map((d: any) => `<tr>
      <td style="font-family:monospace;font-size:10px">${l.code || ''}</td>
      <td style="font-family:monospace;font-size:10px">${d.code || d.id || ''}</td>
      <td style="font-size:12px">${d.name}</td>
      <td style="font-family:monospace;font-size:10px">${d.workstreamCode || '—'}</td>
      <td>${d.currentScore != null ? maturityChipHTML(d.currentScore) : '—'}</td>
      <td>${d.targetScore != null ? maturityChipHTML(d.targetScore) : '—'}</td>
    </tr>`)).join('')}</tbody>
  </table>
</details>

<div class="footer">
  ${workshop.customerName} — Comprehensive Assessment Report · ${date} · Galent SalesPilot · Confidential
</div>
</div>
</body></html>`;
}

// ═══════ ROADMAP REPORT (phased transformation roadmap) ═══════
export function generateRoadmapHTML(workshop: any): string {
  const stats = workshopStats(workshop);
  const gaps = gapsForWorkshop(workshop);
  const levels = workshop.framework?.levels || [];
  const workstreams = workshop.framework?.workstreams || [];
  const useCases = workshop.useCases || [];
  const scopeItems = workshop.scopeItems || [];
  const rollups = rollupByWorkstream(gaps, workstreams, scopeItems);
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Phase breakdown
  const phases = [
    { id: 'P1', label: 'Phase 1', range: '0–3 months', desc: 'Foundation & Quick Wins', color: '#22c55e' },
    { id: 'P2', label: 'Phase 2', range: '3–6 months', desc: 'Build & Scale', color: '#3b82f6' },
    { id: 'P3', label: 'Phase 3', range: '6–12 months', desc: 'Optimize & Transform', color: '#7c3aed' },
  ];
  const phaseData = phases.map(p => {
    const items = scopeItems.filter((s: any) => (s.phase || 'P1') === p.id);
    const phaseGaps = gaps.filter(g => {
      const si = scopeItems.find((s: any) => s.dimensionId === g.dimensionId || s.workstreamCode === g.workstreamCode);
      return si ? (si.phase || 'P1') === p.id : p.id === 'P1';
    });
    const effort = items.reduce((s: number, si: any) => s + (si.effort || 0), 0);
    return { ...p, items, gaps: phaseGaps, effort, count: items.length };
  });
  const totalEffort = scopeItems.reduce((s: number, si: any) => s + (si.effort || 0), 0) || gaps.reduce((s, g) => s + g.gap * 3, 0);
  const maxPhaseEffort = Math.max(...phaseData.map(p => p.effort), 1);

  // SVG timeline
  const tlWidth = 860;
  const tlHeight = 100;
  const phaseWidths = phaseData.map(p => Math.max(totalEffort > 0 ? (p.effort / totalEffort) * (tlWidth - 40) : (tlWidth - 40) / 3, 80));
  let tlX = 20;
  const tlBars = phaseData.map((p, i) => {
    const w = phaseWidths[i];
    const bar = `<rect x="${tlX}" y="30" width="${w}" height="40" rx="6" fill="${p.color}" opacity="0.15" style="-webkit-print-color-adjust:exact;print-color-adjust:exact"/>
      <rect x="${tlX}" y="30" width="${w}" height="40" rx="6" fill="none" stroke="${p.color}" stroke-width="2" style="-webkit-print-color-adjust:exact;print-color-adjust:exact"/>
      <text x="${tlX + w/2}" y="47" text-anchor="middle" font-size="11" font-weight="700" fill="${p.color}" font-family="Space Grotesk,sans-serif">${p.label}</text>
      <text x="${tlX + w/2}" y="62" text-anchor="middle" font-size="9" fill="#666">${p.range}</text>
      <text x="${tlX + w/2}" y="22" text-anchor="middle" font-size="10" fill="#333" font-weight="600">${p.count} items · ${p.effort} pts</text>
      <circle cx="${tlX}" cy="80" r="4" fill="${p.color}" style="-webkit-print-color-adjust:exact;print-color-adjust:exact"/>`;
    tlX += w + 10;
    return bar;
  }).join('');

  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${workshop.customerName} — Transformation Roadmap</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
<style>${SHARED_CSS}
.phase-card{border-top:4px solid;border-radius:12px;padding:20px;background:#fafafa}
.track-card{border:1px solid #e9ecef;border-radius:10px;padding:16px;margin:10px 0}
.track-header{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.track-badge{padding:4px 10px;border-radius:6px;font-family:monospace;font-size:12px;font-weight:700;color:white;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.milestone{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f5f5f5;font-size:12px}
</style>
</head><body>
<div class="page">

<!-- HERO -->
<div class="hero">
  <div style="font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.35);margin-bottom:6px">Transformation Roadmap</div>
  <h1>${workshop.customerName}</h1>
  <div class="sub">${workshop.title} · ${stats.stage} · ${date}</div>
  <div style="display:flex;gap:12px;margin-top:16px;flex-wrap:wrap">
    ${[
      { v: `${totalEffort} pts`, l: 'Total Effort' },
      { v: scopeItems.length || gaps.length, l: 'Scope Items' },
      { v: rollups.length, l: 'Workstreams' },
      { v: gaps.length, l: 'Gaps to Close' },
      { v: `${stats.index}/100`, l: 'Current Index' },
    ].map(k => `<div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:8px 14px;text-align:center">
      <div style="font-size:16px;font-weight:700;color:#0FB5AD;font-family:'Space Grotesk',sans-serif">${k.v}</div>
      <div style="font-size:8px;color:rgba(255,255,255,0.4);text-transform:uppercase">${k.l}</div>
    </div>`).join('')}
  </div>
</div>

<!-- NAV -->
<div class="nav">
  <a href="#phases">Phases</a>
  <a href="#timeline">Timeline</a>
  <a href="#tracks">Workstream Tracks</a>
  <a href="#resources">Resources</a>
  <a href="#investment">Investment</a>
  <a href="#risks">Risks</a>
  <a href="#success">Success Metrics</a>
  <a href="#governance">Governance</a>
</div>

<!-- PHASE SUMMARY -->
<h2 id="phases">Phase Summary</h2>
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px">
  ${phaseData.map(p => `<div class="phase-card" style="border-color:${p.color}">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <span style="font-size:14px;font-weight:700;color:${p.color};font-family:'Space Grotesk',sans-serif">${p.label}</span>
      <span style="font-size:11px;color:#888">${p.range}</span>
    </div>
    <div style="font-size:12px;color:#666;margin-bottom:12px">${p.desc}</div>
    <div style="display:flex;gap:16px">
      <div style="text-align:center">
        <div style="font-size:22px;font-weight:700;color:${p.color};font-family:'Space Grotesk',sans-serif">${p.count}</div>
        <div style="font-size:9px;color:#888;text-transform:uppercase">Items</div>
      </div>
      <div style="text-align:center">
        <div style="font-size:22px;font-weight:700;color:${p.color};font-family:'Space Grotesk',sans-serif">${p.effort}</div>
        <div style="font-size:9px;color:#888;text-transform:uppercase">Effort pts</div>
      </div>
      <div style="text-align:center">
        <div style="font-size:22px;font-weight:700;color:${p.color};font-family:'Space Grotesk',sans-serif">${p.gaps.length}</div>
        <div style="font-size:9px;color:#888;text-transform:uppercase">Gaps</div>
      </div>
    </div>
    <div class="bar-h" style="margin-top:12px;height:6px"><div class="bar-fill" style="width:${maxPhaseEffort > 0 ? (p.effort / maxPhaseEffort) * 100 : 33}%;background:${p.color}"></div></div>
    ${p.items.length > 0 ? `<details style="margin-top:8px">
      <summary>${p.items.length} scope items</summary>
      ${p.items.slice(0, 10).map((si: any) => `<div class="milestone"><span style="width:6px;height:6px;border-radius:3px;background:${p.color};flex-shrink:0;-webkit-print-color-adjust:exact;print-color-adjust:exact"></span><span style="flex:1">${si.title || si.name || '—'}</span><span style="font-family:monospace;font-size:10px;color:#888">${si.effort || 0} pts</span></div>`).join('')}
      ${p.items.length > 10 ? `<div style="font-size:10px;color:#999;padding:4px 0">+${p.items.length - 10} more</div>` : ''}
    </details>` : ''}
  </div>`).join('')}
</div>

<!-- TIMELINE SVG -->
<h2 id="timeline">Timeline Visualization</h2>
<div class="card" style="overflow-x:auto">
  <svg width="${tlWidth}" height="${tlHeight}" viewBox="0 0 ${tlWidth} ${tlHeight}" style="display:block;margin:0 auto">
    <line x1="20" y1="80" x2="${tlWidth - 20}" y2="80" stroke="#e4e7ee" stroke-width="2"/>
    ${tlBars}
    <polygon points="${tlWidth - 20},76 ${tlWidth - 10},80 ${tlWidth - 20},84" fill="#e4e7ee"/>
  </svg>
</div>

<!-- PER-WORKSTREAM TRACKS -->
<h2 id="tracks">Workstream Tracks</h2>
${rollups.length === 0 ? '<div class="card"><p style="font-size:13px;color:#888">No impacted workstreams identified.</p></div>' :
rollups.map((ws, wi) => {
  const wsScope = scopeItems.filter((s: any) => s.workstreamCode === ws.code);
  const colors = ['#7c3aed', '#3b82f6', '#0A867F', '#f59e0b', '#C8472E', '#22c55e', '#6E97C2', '#D97A2B'];
  const wsColor = colors[wi % colors.length];
  return `
<div class="track-card">
  <div class="track-header">
    <div class="track-badge" style="background:${wsColor}">${ws.code}</div>
    <div style="flex:1">
      <div style="font-weight:600;font-size:14px">${ws.name}</div>
      <div style="font-size:11px;color:#666">${ws.objective}</div>
    </div>
    <div style="text-align:right;font-size:12px;color:#888">${ws.totalEffort} pts · ${ws.gaps.length} gaps</div>
  </div>

  <div style="margin-bottom:12px">
    <div style="font-size:11px;font-weight:600;color:#555;margin-bottom:6px">Gaps Addressed</div>
    ${ws.gaps.map(g => `<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:11px">
      ${severityChip(g.gap, g.priority)}
      <span style="flex:1">${g.dimensionName}</span>
      <span style="font-family:monospace;font-size:10px;color:#888">${MATURITY[g.current].slice(0,3)} &#8594; ${MATURITY[g.target].slice(0,3)}</span>
    </div>`).join('')}
  </div>

  ${wsScope.length > 0 ? `<div style="margin-bottom:12px">
    <div style="font-size:11px;font-weight:600;color:#555;margin-bottom:6px">Scope Items</div>
    <table class="tbl">
      <thead><tr><th>Item</th><th>Effort</th><th>Phase</th><th>Owner</th></tr></thead>
      <tbody>${wsScope.map((si: any) => `<tr>
        <td style="font-size:12px">${si.title || si.name || '—'}</td>
        <td style="text-align:center;font-weight:600">${si.effort || 0}</td>
        <td><span class="chip" style="background:${(phases.find(p => p.id === (si.phase || 'P1'))?.color || '#22c55e')}15;color:${phases.find(p => p.id === (si.phase || 'P1'))?.color || '#22c55e'}">${si.phase || 'P1'}</span></td>
        <td style="font-size:11px;color:#666">${si.owner || '—'}</td>
      </tr>`).join('')}</tbody>
    </table>
  </div>` : ''}

  ${ws.gaps.some(g => g.gap >= 2) ? `<div style="font-size:11px;color:#777"><strong>Dependencies:</strong> ${ws.gaps.filter(g => g.gap >= 2).map(g => g.dimensionName).join(', ')} require foundational work before scaling.</div>` : ''}
</div>`;
}).join('')}

<!-- RESOURCE REQUIREMENTS -->
<h2 id="resources">Resource Requirements</h2>
<div class="card">
  <p style="font-size:12px;color:#666;margin-bottom:12px">Estimated resource allocation based on ${totalEffort} total effort points across ${rollups.length} workstreams.</p>
  <table class="tbl">
    <thead><tr><th>Workstream</th><th>Effort Points</th><th>% of Total</th><th>Est. FTEs (3mo)</th><th>Phases</th></tr></thead>
    <tbody>${rollups.map(ws => {
      const pct = totalEffort > 0 ? (ws.totalEffort / totalEffort * 100).toFixed(1) : '0';
      const ftes = (ws.totalEffort / 40).toFixed(1); // rough: 40 pts per FTE per quarter
      return `<tr>
        <td><span style="font-family:monospace;font-weight:700;color:#7c3aed;margin-right:6px">${ws.code}</span>${ws.name}</td>
        <td style="text-align:center;font-weight:600">${ws.totalEffort}</td>
        <td style="text-align:center">${pct}%</td>
        <td style="text-align:center;font-weight:600;color:#0A867F">${ftes}</td>
        <td>${ws.phases.map(p => `<span class="chip" style="background:#3b82f615;color:#3b82f6">${p}</span>`).join(' ')}</td>
      </tr>`;
    }).join('')}
    <tr style="font-weight:700;border-top:2px solid #333">
      <td>Total</td>
      <td style="text-align:center">${totalEffort}</td>
      <td style="text-align:center">100%</td>
      <td style="text-align:center;color:#0A867F">${(totalEffort / 40).toFixed(1)}</td>
      <td></td>
    </tr></tbody>
  </table>
</div>

<!-- INVESTMENT BREAKDOWN -->
<h2 id="investment">Investment Breakdown</h2>
<div class="two-col">
  <div class="card">
    <h3>Effort by Phase</h3>
    <div style="margin-top:12px">
      ${phaseData.map(p => `<div style="display:flex;align-items:center;gap:8px;margin:8px 0">
        <span style="font-size:11px;width:60px;color:${p.color};font-weight:600">${p.label}</span>
        <div style="flex:1;height:10px;background:#e9ecef;border-radius:5px;overflow:hidden">
          <div style="height:100%;width:${totalEffort > 0 ? (p.effort / totalEffort) * 100 : 0}%;background:${p.color};border-radius:5px;-webkit-print-color-adjust:exact;print-color-adjust:exact"></div>
        </div>
        <span style="font-size:12px;font-weight:600;width:50px;text-align:right">${p.effort} pts</span>
      </div>`).join('')}
    </div>
  </div>
  <div class="card">
    <h3>Effort by Workstream</h3>
    <div style="margin-top:12px">
      ${rollups.slice(0, 8).map((ws, i) => {
        const colors = ['#7c3aed', '#3b82f6', '#0A867F', '#f59e0b', '#C8472E', '#22c55e', '#6E97C2', '#D97A2B'];
        return `<div style="display:flex;align-items:center;gap:8px;margin:8px 0">
          <span style="font-size:10px;width:36px;font-family:monospace;font-weight:700;color:${colors[i % colors.length]}">${ws.code}</span>
          <div style="flex:1;height:10px;background:#e9ecef;border-radius:5px;overflow:hidden">
            <div style="height:100%;width:${totalEffort > 0 ? (ws.totalEffort / totalEffort) * 100 : 0}%;background:${colors[i % colors.length]};border-radius:5px;-webkit-print-color-adjust:exact;print-color-adjust:exact"></div>
          </div>
          <span style="font-size:12px;font-weight:600;width:50px;text-align:right">${ws.totalEffort}</span>
        </div>`;
      }).join('')}
    </div>
  </div>
</div>

<!-- RISKS & MITIGATION -->
<h2 id="risks">Risks & Mitigation</h2>
<div class="card">
  <table class="tbl">
    <thead><tr><th>Risk</th><th>Likelihood</th><th>Impact</th><th>Mitigation</th></tr></thead>
    <tbody>
      ${gaps.filter(g => g.gap >= 3).length > 0 ? `<tr>
        <td><strong>Critical maturity gaps block progress</strong><br><span style="font-size:10px;color:#888">${gaps.filter(g => g.gap >= 3).map(g => g.dimensionName).join(', ')}</span></td>
        <td><span class="chip sev-crit">High</span></td>
        <td><span class="chip sev-crit">High</span></td>
        <td style="font-size:12px">Prioritize P1 foundation work; assign dedicated owners to critical dimensions</td>
      </tr>` : ''}
      <tr>
        <td><strong>Resource constraints delay phasing</strong></td>
        <td><span class="chip sev-med">Medium</span></td>
        <td><span class="chip sev-high">High</span></td>
        <td style="font-size:12px">Establish cross-functional teams; consider augmentation models for peak demand</td>
      </tr>
      <tr>
        <td><strong>Change resistance across levels</strong></td>
        <td><span class="chip sev-med">Medium</span></td>
        <td><span class="chip sev-med">Medium</span></td>
        <td style="font-size:12px">Secure executive sponsorship; demonstrate quick wins in P1</td>
      </tr>
      ${rollups.length > 4 ? `<tr>
        <td><strong>Cross-workstream dependency conflicts</strong><br><span style="font-size:10px;color:#888">${rollups.length} active workstreams</span></td>
        <td><span class="chip sev-med">Medium</span></td>
        <td><span class="chip sev-high">High</span></td>
        <td style="font-size:12px">Establish a program management office; regular cross-stream sync</td>
      </tr>` : ''}
      <tr>
        <td><strong>Technology integration complexity</strong></td>
        <td><span class="chip sev-low">Low</span></td>
        <td><span class="chip sev-med">Medium</span></td>
        <td style="font-size:12px">Architecture review gates between phases; proof-of-concept before scale</td>
      </tr>
    </tbody>
  </table>
</div>

<!-- SUCCESS METRICS -->
<h2 id="success">Success Metrics</h2>
<div class="card">
  <p style="font-size:12px;color:#666;margin-bottom:12px">Key performance indicators derived from the assessment gaps:</p>
  <table class="tbl">
    <thead><tr><th>#</th><th>Metric</th><th>Current</th><th>Target</th><th>Workstream</th><th>Phase</th></tr></thead>
    <tbody>
      <tr>
        <td>1</td>
        <td><strong>Overall Readiness Index</strong></td>
        <td style="font-weight:600">${stats.index}/100</td>
        <td style="font-weight:600;color:#0A867F">${Math.min(100, stats.index + Math.round(gaps.reduce((s, g) => s + g.gap * 5, 0)))}/100</td>
        <td style="font-size:11px">All</td>
        <td><span class="chip" style="background:#7c3aed15;color:#7c3aed">P3</span></td>
      </tr>
      ${gaps.filter(g => g.gap >= 2).slice(0, 8).map((g, i) => `<tr>
        <td>${i + 2}</td>
        <td><strong>${g.dimensionName}</strong> maturity</td>
        <td>${maturityChipHTML(g.current)}</td>
        <td>${maturityChipHTML(g.target)}</td>
        <td style="font-family:monospace;font-size:11px;color:#7c3aed">${g.workstreamCode || '—'}</td>
        <td><span class="chip" style="background:#3b82f615;color:#3b82f6">${g.gap >= 3 ? 'P1-P3' : 'P1-P2'}</span></td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>

<!-- GOVERNANCE MODEL -->
<h2 id="governance">Governance Model</h2>
<div class="card">
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px">
    <div style="padding:16px;background:#f8fffe;border-radius:8px;border:1px solid #0A867F20">
      <div style="font-weight:700;color:#0A867F;font-size:13px;margin-bottom:6px">Steering Committee</div>
      <div style="font-size:11px;color:#666">Monthly review of roadmap progress, budget, and risk register. Executive sponsors + workstream leads.</div>
    </div>
    <div style="padding:16px;background:#f5f3ff;border-radius:8px;border:1px solid #7c3aed20">
      <div style="font-weight:700;color:#7c3aed;font-size:13px;margin-bottom:6px">Program Stand-up</div>
      <div style="font-size:11px;color:#666">Bi-weekly cross-workstream sync. Track dependencies, blockers, and milestone delivery.</div>
    </div>
    <div style="padding:16px;background:#eff6ff;border-radius:8px;border:1px solid #3b82f620">
      <div style="font-weight:700;color:#3b82f6;font-size:13px;margin-bottom:6px">Phase Gate Reviews</div>
      <div style="font-size:11px;color:#666">Formal assessment at each phase boundary. Go/no-go based on defined success criteria.</div>
    </div>
    <div style="padding:16px;background:#fefce8;border-radius:8px;border:1px solid #f59e0b20">
      <div style="font-weight:700;color:#f59e0b;font-size:13px;margin-bottom:6px">Maturity Re-assessment</div>
      <div style="font-size:11px;color:#666">Quarterly re-scoring of all dimensions to measure progress against baseline.</div>
    </div>
  </div>
</div>

<div class="footer">
  ${workshop.customerName} — Transformation Roadmap · ${date} · Galent SalesPilot · Confidential
</div>
</div>
</body></html>`;
}

// ═══════ ARCHITECTURE REPORT (technical deep dive) ═══════
export function generateArchitectureHTML(workshop: any): string {
  const stats = workshopStats(workshop);
  const gaps = gapsForWorkshop(workshop);
  const levels = workshop.framework?.levels || [];
  const workstreams = workshop.framework?.workstreams || [];
  const scopeItems = workshop.scopeItems || [];
  const rollups = rollupByWorkstream(gaps, workstreams, scopeItems);
  const allDims = levels.flatMap((l: any) => l.dimensions || []);
  const scored = allDims.filter((d: any) => d.currentScore != null);
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Identify architecture-related dimensions by keyword matching
  const archKeywords = ['architecture', 'platform', 'toolkit', 'integration', 'interop', 'stack', 'infrastructure', 'data', 'model', 'llm', 'gcp', 'cloud', 'build', 'security', 'agent'];
  const archDims = allDims.filter((d: any) => archKeywords.some(k => (d.name || '').toLowerCase().includes(k) || (d.probe || '').toLowerCase().includes(k)));
  const archGaps = gaps.filter(g => archKeywords.some(k => g.dimensionName.toLowerCase().includes(k)));
  const criticalArchGaps = archGaps.filter(g => g.gap >= 3 || (g.gap >= 2 && g.priority));
  const maxBarWidth = 400;

  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${workshop.customerName} — Architecture Deep Dive</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
<style>${SHARED_CSS}
.arch-bar{display:flex;align-items:center;gap:8px;margin:6px 0}
.arch-bar .label{font-size:11px;width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.arch-bar .bar-track{flex:1;height:14px;background:#e9ecef;border-radius:7px;overflow:hidden;position:relative}
.arch-bar .bar-current{height:100%;border-radius:7px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.arch-bar .bar-target{position:absolute;top:0;height:100%;border-right:3px solid #D97A2B;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.arch-bar .score{font-size:11px;font-weight:700;width:30px;text-align:right;font-family:'Space Grotesk',sans-serif}
.adr{border:1px solid #e9ecef;border-radius:10px;padding:16px;margin:12px 0;page-break-inside:avoid}
.adr-header{display:flex;align-items:center;gap:12px;margin-bottom:10px}
.adr-id{font-family:monospace;font-weight:700;color:#7c3aed;font-size:11px}
.adr-section{margin:8px 0}
.adr-section .adr-label{font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#888;font-weight:600;margin-bottom:4px}
.adr-section p{font-size:12px;color:#555;line-height:1.6}
</style>
</head><body>
<div class="page">

<!-- HERO -->
<div class="hero" style="background:linear-gradient(135deg,#0B1120 0%,#1a2744 50%,#0A867F20 100%)">
  <div style="font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.35);margin-bottom:6px">Architecture Deep Dive</div>
  <h1>${workshop.customerName}</h1>
  <div class="sub">${workshop.title} · Technical Assessment · ${date}</div>
  <div style="display:flex;gap:12px;margin-top:16px;flex-wrap:wrap">
    ${[
      { v: allDims.length, l: 'Total Dimensions' },
      { v: archDims.length, l: 'Architecture Dims' },
      { v: archGaps.length, l: 'Technical Gaps' },
      { v: criticalArchGaps.length, l: 'Critical Tech Gaps' },
      { v: `${stats.index}/100`, l: 'Readiness Index' },
    ].map(k => `<div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:8px 14px;text-align:center">
      <div style="font-size:16px;font-weight:700;color:#0FB5AD;font-family:'Space Grotesk',sans-serif">${k.v}</div>
      <div style="font-size:8px;color:rgba(255,255,255,0.4);text-transform:uppercase">${k.l}</div>
    </div>`).join('')}
  </div>
</div>

<!-- NAV -->
<div class="nav">
  <a href="#current-state">Current State</a>
  <a href="#maturity">Platform Maturity</a>
  <a href="#gap-matrix">Gap Matrix</a>
  <a href="#target">Target Architecture</a>
  <a href="#integration">Integration</a>
  <a href="#security">Security & Compliance</a>
  <a href="#adrs">Architecture Decisions</a>
  <a href="#migration">Migration Strategy</a>
</div>

<!-- CURRENT STATE ARCHITECTURE -->
<h2 id="current-state">Current State Architecture</h2>
${levels.map((level: any, li: number) => {
  const dims = level.dimensions || [];
  const levelScored = dims.filter((d: any) => d.currentScore != null);
  const r = levelReadiness(level);
  return `
<div class="card">
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
    <div style="background:#0B1120;color:#0FB5AD;width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;font-family:'Space Grotesk',sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact">${level.code || `L${li+1}`}</div>
    <div style="flex:1"><div style="font-weight:600">${level.name}</div><div style="font-size:11px;color:#888">${r.currentPct}% readiness · ${levelScored.length}/${dims.length} scored</div></div>
  </div>
  ${dims.length > 0 ? `<table class="tbl">
    <thead><tr><th>Dimension</th><th>Current Maturity</th><th>Finding</th></tr></thead>
    <tbody>${dims.map((d: any) => `<tr>
      <td><strong>${d.name}</strong>${archKeywords.some(k => (d.name || '').toLowerCase().includes(k)) ? ' <span style="font-size:8px;background:#0A867F15;color:#0A867F;padding:1px 5px;border-radius:3px">ARCH</span>' : ''}</td>
      <td>${d.currentScore != null ? maturityChipHTML(d.currentScore) : '<span style="color:#ccc">Not scored</span>'}</td>
      <td style="font-size:11px;color:#555;max-width:350px">${d.finding?.body ? d.finding.body.slice(0, 180) + (d.finding.body.length > 180 ? '...' : '') : '<span style="color:#ccc">—</span>'}</td>
    </tr>`).join('')}</tbody>
  </table>` : '<p style="font-size:12px;color:#888">No dimensions in this level.</p>'}
</div>`;
}).join('')}

<!-- PLATFORM MATURITY ASSESSMENT -->
<h2 id="maturity">Platform Maturity Assessment</h2>
<div class="card">
  <p style="font-size:12px;color:#666;margin-bottom:16px">Horizontal bars show current maturity (filled) and target maturity (marker) for each scored dimension.</p>
  ${scored.map((d: any) => {
    const targetVal = d.targetScore != null ? d.targetScore : d.currentScore;
    return `<div class="arch-bar">
      <div class="label" title="${d.name}">${d.name}</div>
      <div class="bar-track">
        <div class="bar-current" style="width:${(d.currentScore / 4) * 100}%;background:${MATURITY_COLORS[d.currentScore]}"></div>
        ${d.targetScore != null && d.targetScore > d.currentScore ? `<div class="bar-target" style="left:${(d.targetScore / 4) * 100}%"></div>` : ''}
      </div>
      <div class="score" style="color:${MATURITY_COLORS[d.currentScore]}">${d.currentScore}</div>
      ${d.targetScore != null && d.targetScore > d.currentScore ? `<div style="font-size:9px;color:#D97A2B;width:20px">&#8594;${d.targetScore}</div>` : '<div style="width:20px"></div>'}
    </div>`;
  }).join('')}
  <div style="display:flex;gap:12px;margin-top:12px;justify-content:center">
    ${MATURITY.map((label, i) => `<span style="display:flex;align-items:center;gap:4px;font-size:9px;color:#888">
      <span style="width:8px;height:8px;border-radius:4px;background:${MATURITY_COLORS[i]};-webkit-print-color-adjust:exact;print-color-adjust:exact"></span>${label}
    </span>`).join('')}
    <span style="display:flex;align-items:center;gap:4px;font-size:9px;color:#D97A2B">
      <span style="width:3px;height:12px;background:#D97A2B;-webkit-print-color-adjust:exact;print-color-adjust:exact"></span>Target
    </span>
  </div>
</div>

<!-- TECHNOLOGY GAP MATRIX -->
<h2 id="gap-matrix">Technology Gap Matrix</h2>
<div class="card">
  ${gaps.length === 0 ? '<p style="font-size:12px;color:#888">No gaps identified.</p>' : `
  <table class="tbl">
    <thead><tr><th>Dimension</th><th>Level</th><th>Current</th><th>Target</th><th>Gap</th><th>Technical Implication</th><th>Workstream</th></tr></thead>
    <tbody>${[...gaps].sort((a, b) => b.gap - a.gap).map(g => {
      const parentLevel = levels.find((l: any) => l.id === g.levelId);
      const isArch = archKeywords.some(k => g.dimensionName.toLowerCase().includes(k));
      return `<tr${isArch ? ' style="background:#f8fffe"' : ''}>
        <td><strong>${g.dimensionName}</strong>${isArch ? ' <span style="font-size:8px;background:#0A867F15;color:#0A867F;padding:1px 5px;border-radius:3px">ARCH</span>' : ''}</td>
        <td style="font-size:10px;font-family:monospace;color:#666">${parentLevel?.code || '—'}</td>
        <td>${maturityChipHTML(g.current)}</td>
        <td>${maturityChipHTML(g.target)}</td>
        <td>${severityChip(g.gap, g.priority)}</td>
        <td style="font-size:11px;color:#555;max-width:220px">${g.finding || `Requires advancement from ${MATURITY[g.current]} to ${MATURITY[g.target]} level practices.`}</td>
        <td style="font-family:monospace;font-size:10px;color:#7c3aed">${g.workstreamCode || '—'}</td>
      </tr>`;
    }).join('')}</tbody>
  </table>`}
</div>

<!-- TARGET ARCHITECTURE -->
<h2 id="target">Target Architecture</h2>
<div class="card">
  <p style="font-size:13px;margin-bottom:16px">Recommended target maturity levels based on assessment findings and organizational readiness.</p>
  <div class="two-col">
    ${levels.map((level: any, li: number) => {
      const dims = (level.dimensions || []).filter((d: any) => d.targetScore != null);
      const r = levelReadiness(level);
      return `<div style="margin-bottom:16px">
        <div style="font-weight:600;font-size:13px;margin-bottom:6px">${level.code || `L${li+1}`} ${level.name}</div>
        <div style="display:flex;gap:12px;margin-bottom:8px;font-size:11px">
          <span>Current: <strong style="color:${MATURITY_COLORS[Math.min(4, Math.round(r.currentPct/25))]}">${r.currentPct}%</strong></span>
          <span>Target: <strong style="color:#D97A2B">${r.targetPct}%</strong></span>
          <span>Uplift: <strong style="color:#0A867F">+${r.targetPct - r.currentPct}pp</strong></span>
        </div>
        ${dims.length > 0 ? dims.map((d: any) => `<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:11px">
          <span style="flex:1">${d.name}</span>
          ${d.currentScore != null ? maturityChipHTML(d.currentScore) : ''}
          <span style="color:#888">&#8594;</span>
          ${maturityChipHTML(d.targetScore)}
        </div>`).join('') : '<div style="font-size:11px;color:#ccc">No targets set</div>'}
      </div>`;
    }).join('')}
  </div>
</div>

<!-- INTEGRATION & INTEROPERABILITY -->
<h2 id="integration">Integration & Interoperability</h2>
<div class="card">
  ${(() => {
    const intDims = allDims.filter((d: any) => ['integration', 'interop', 'api', 'data', 'stack'].some(k => (d.name || '').toLowerCase().includes(k)));
    if (intDims.length === 0) return '<p style="font-size:12px;color:#888">No integration-specific dimensions identified in this framework. Review workstreams related to technology stack and integration for relevant findings.</p>';
    return `<p style="font-size:12px;color:#666;margin-bottom:12px">${intDims.length} dimension${intDims.length !== 1 ? 's' : ''} related to integration and interoperability:</p>
    ${intDims.map((d: any) => `<div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid #f0f0f0">
      <div style="flex:1"><strong style="font-size:13px">${d.name}</strong>${d.probe ? `<div style="font-size:11px;color:#888;font-style:italic;margin-top:2px">${d.probe}</div>` : ''}</div>
      <div>${d.currentScore != null ? maturityChipHTML(d.currentScore) : '<span style="color:#ccc">—</span>'}</div>
      ${d.finding?.body ? `<div style="font-size:11px;color:#555;max-width:250px">${d.finding.body.slice(0, 120)}...</div>` : ''}
    </div>`).join('')}`;
  })()}
</div>

<!-- SECURITY & COMPLIANCE -->
<h2 id="security">Security & Compliance</h2>
<div class="card">
  ${(() => {
    const secDims = allDims.filter((d: any) => ['security', 'compliance', 'risk', 'responsible', 'pci', 'sox', 'okta', 'eval', 'quality'].some(k => (d.name || '').toLowerCase().includes(k)));
    if (secDims.length === 0) return '<p style="font-size:12px;color:#888">No security/compliance-specific dimensions identified. Review governance-related workstreams for relevant findings.</p>';
    const secScored = secDims.filter((d: any) => d.currentScore != null);
    const secAvg = secScored.length > 0 ? secScored.reduce((s: number, d: any) => s + d.currentScore, 0) / secScored.length : 0;
    return `<div style="display:flex;gap:16px;margin-bottom:16px;align-items:center">
      <div style="text-align:center">
        <div style="font-size:28px;font-weight:700;color:${MATURITY_COLORS[Math.round(secAvg)]};font-family:'Space Grotesk',sans-serif">${secAvg.toFixed(1)}/4</div>
        <div style="font-size:10px;color:#888">Security Posture</div>
      </div>
      <div style="flex:1">
        <div class="bar-h" style="height:10px"><div class="bar-fill" style="width:${(secAvg/4)*100}%;background:${MATURITY_COLORS[Math.round(secAvg)]}"></div></div>
      </div>
    </div>
    <table class="tbl">
      <thead><tr><th>Dimension</th><th>Current</th><th>Target</th><th>Status</th><th>Finding</th></tr></thead>
      <tbody>${secDims.map((d: any) => {
        const hasGap = d.currentScore != null && d.targetScore != null && d.targetScore > d.currentScore;
        return `<tr>
          <td><strong>${d.name}</strong></td>
          <td>${d.currentScore != null ? maturityChipHTML(d.currentScore) : '—'}</td>
          <td>${d.targetScore != null ? maturityChipHTML(d.targetScore) : '—'}</td>
          <td>${hasGap ? severityChip(d.targetScore - d.currentScore, !!d.priority) : (d.currentScore != null ? '<span style="color:#22c55e;font-size:11px">On Target</span>' : '')}</td>
          <td style="font-size:11px;color:#555;max-width:250px">${d.finding?.body ? d.finding.body.slice(0, 120) + '...' : '—'}</td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;
  })()}
</div>

<!-- ARCHITECTURE DECISION RECORDS -->
<h2 id="adrs">Architecture Decision Records</h2>
${gaps.filter(g => g.gap >= 2).length === 0 ? '<div class="card"><p style="font-size:12px;color:#888">No significant gaps requiring architecture decisions.</p></div>' : `
<p style="font-size:12px;color:#666;margin-bottom:8px">Key architecture decisions derived from critical and high-severity gaps:</p>
${gaps.filter(g => g.gap >= 2).sort((a, b) => b.gap - a.gap).map((g, i) => `<div class="adr">
  <div class="adr-header">
    <span class="adr-id">ADR-${String(i + 1).padStart(3, '0')}</span>
    <strong style="flex:1;font-size:14px">${g.dimensionName}</strong>
    ${severityChip(g.gap, g.priority)}
  </div>
  <div class="adr-section">
    <div class="adr-label">Context</div>
    <p>${g.finding || `${g.dimensionName} is currently at ${MATURITY[g.current]} maturity (${g.current}/4). The target state of ${MATURITY[g.target]} (${g.target}/4) requires a ${g.gap}-level advancement.`}</p>
  </div>
  <div class="adr-section">
    <div class="adr-label">Decision</div>
    <p>Invest in advancing ${g.dimensionName} from ${MATURITY[g.current]} to ${MATURITY[g.target]} through ${g.workstreamCode || 'targeted workstream'} initiatives. ${g.gap >= 3 ? 'This is a multi-phase effort requiring structural change.' : 'This can be achieved within 1-2 phases with focused effort.'}</p>
  </div>
  <div class="adr-section">
    <div class="adr-label">Rationale</div>
    <p>${g.priority ? 'This is a priority dimension. ' : ''}A gap of ${g.gap} level${g.gap > 1 ? 's' : ''} in ${g.dimensionName} ${g.gap >= 3 ? 'poses existential risk to the transformation program' : 'limits the effectiveness of adjacent capabilities'}. Closing this gap is ${g.gap >= 3 ? 'critical path' : 'important'} for achieving target readiness.</p>
  </div>
  <div class="adr-section">
    <div class="adr-label">Consequences</div>
    <p>Requires allocation of ${g.gap * 3} effort points. ${g.gap >= 3 ? 'Will impact resource availability for other workstreams. Must be sequenced as a foundation item.' : 'Can be parallelized with related workstream activities.'}</p>
  </div>
</div>`).join('')}`}

<!-- MIGRATION STRATEGY -->
<h2 id="migration">Migration Strategy</h2>
<div class="card">
  <p style="font-size:13px;margin-bottom:16px">Phased approach to transition from current to target architecture state:</p>
  ${[
    { phase: 'Phase 1: Assess & Stabilize', color: '#22c55e', items: gaps.filter(g => g.gap === 1).map(g => g.dimensionName), desc: 'Close quick-win gaps (single-level improvements). Establish baselines and governance foundations.' },
    { phase: 'Phase 2: Build & Integrate', color: '#3b82f6', items: gaps.filter(g => g.gap === 2).map(g => g.dimensionName), desc: 'Address moderate gaps requiring platform and process changes. Build reusable capabilities.' },
    { phase: 'Phase 3: Transform & Optimize', color: '#7c3aed', items: gaps.filter(g => g.gap >= 3).map(g => g.dimensionName), desc: 'Tackle deep structural gaps. Drive organizational transformation and continuous improvement.' },
  ].map(p => `<div style="border-left:4px solid ${p.color};padding:12px 16px;margin:12px 0;border-radius:0 8px 8px 0;background:#fafafa;-webkit-print-color-adjust:exact;print-color-adjust:exact">
    <div style="font-weight:700;color:${p.color};font-size:14px;margin-bottom:4px">${p.phase}</div>
    <p style="font-size:12px;color:#555;margin-bottom:8px">${p.desc}</p>
    ${p.items.length > 0 ? `<div style="font-size:11px;color:#888"><strong>Dimensions:</strong> ${p.items.join(', ')}</div>` : '<div style="font-size:11px;color:#ccc">No dimensions in this phase.</div>'}
  </div>`).join('')}
</div>

<div class="footer">
  ${workshop.customerName} — Architecture Deep Dive · ${date} · Galent SalesPilot · Confidential
</div>
</div>
</body></html>`;
}

// ═══════ EXECUTIVE BRIEFING (crisp 2-3 page board-ready) ═══════
export function generateExecBriefingHTML(workshop: any): string {
  const stats = workshopStats(workshop);
  const gaps = gapsForWorkshop(workshop);
  const levels = workshop.framework?.levels || [];
  const workstreams = workshop.framework?.workstreams || [];
  const useCases = workshop.useCases || [];
  const scopeItems = workshop.scopeItems || [];
  const rollups = rollupByWorkstream(gaps, workstreams, scopeItems);
  const allDims = levels.flatMap((l: any) => l.dimensions || []);
  const scored = allDims.filter((d: any) => d.currentScore != null);
  const avgMat = scored.length > 0 ? scored.reduce((s: number, d: any) => s + d.currentScore, 0) / scored.length : 0;
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const criticalGaps = gaps.filter(g => g.gap >= 3 || (g.gap >= 2 && g.priority));
  const moderateGaps = gaps.filter(g => g.gap === 2 && !g.priority);
  const lowGaps = gaps.filter(g => g.gap === 1);
  const strengthDims = scored.filter((d: any) => d.currentScore >= 3);
  const topGaps = [...gaps].sort((a, b) => b.gap - a.gap || (b.priority ? 1 : 0) - (a.priority ? 1 : 0));
  const totalEffort = scopeItems.reduce((s: number, si: any) => s + (si.effort || 0), 0) || gaps.reduce((s, g) => s + g.gap * 3, 0);
  const totalWt = levels.reduce((s: number, l: any) => s + (l.weight || 1), 0);

  // Top 5 findings — prefer gaps with findings
  const topFindings = topGaps.filter(g => g.finding).slice(0, 5);
  if (topFindings.length < 5) {
    topGaps.filter(g => !g.finding).slice(0, 5 - topFindings.length).forEach(g => topFindings.push(g));
  }

  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${workshop.customerName} — Executive Briefing</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
<style>${SHARED_CSS}
body{background:#fff}
.exec-page{max-width:900px;margin:0 auto;padding:32px}
.traffic{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin:16px 0}
.traffic-col{border-radius:12px;padding:16px;border-top:4px solid}
.traffic-col h4{font-size:13px;font-weight:700;margin-bottom:8px}
.traffic-col .count{font-size:32px;font-weight:700;font-family:'Space Grotesk',sans-serif;margin-bottom:6px}
.traffic-col li{font-size:11px;margin:4px 0;list-style:none;padding-left:12px;position:relative}
.traffic-col li::before{content:'';position:absolute;left:0;top:6px;width:5px;height:5px;border-radius:50%}
.finding-card{display:flex;gap:12px;padding:14px 0;border-bottom:1px solid #f0f0f0}
.finding-num{width:28px;height:28px;border-radius:14px;background:#0B1120;color:#0FB5AD;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.step{display:flex;gap:12px;padding:10px 0;border-bottom:1px solid #f5f5f5}
.step-num{width:24px;height:24px;border-radius:12px;background:#0A867F;color:white;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
@media print{.traffic-col{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style>
</head><body>
<div class="exec-page">

<!-- HERO — clean and minimal -->
<div class="hero" style="text-align:center;padding:28px 32px">
  <div style="font-size:10px;text-transform:uppercase;letter-spacing:2px;color:rgba(255,255,255,0.35);margin-bottom:12px">Executive Briefing</div>
  <h1 style="font-size:32px;margin-bottom:2px">${workshop.customerName}</h1>
  <div class="sub">${workshop.title} · ${date}</div>
  <div style="margin-top:20px">
    ${svgDial(stats.index, 140)}
    <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:8px">${stats.stage}</div>
  </div>
</div>

<!-- EXECUTIVE SUMMARY PARAGRAPH -->
<div class="card" style="border-left:4px solid #0A867F;margin-top:24px">
  <p style="font-size:14px;line-height:1.9">
    ${workshop.customerName}'s readiness assessment across <strong>${stats.totalDimensions} dimensions</strong>
    and <strong>${levels.length} evaluation levels</strong> yields an overall index of <strong>${stats.index}/100</strong>,
    classified as <strong>${stats.stage}</strong>.
    The average maturity stands at <strong>${avgMat.toFixed(1)}/4 (${MATURITY[Math.round(avgMat)]})</strong>.
    ${criticalGaps.length > 0 ? `<strong>${criticalGaps.length} critical gap${criticalGaps.length !== 1 ? 's' : ''}</strong> demand immediate executive attention.` : 'No critical gaps were identified.'}
    ${useCases.length > 0 ? ` ${useCases.length} use cases have been identified with ${useCases.filter((u: any) => u.isPilot).length} recommended pilots.` : ''}
    ${totalEffort > 0 ? ` The estimated transformation effort is <strong>${totalEffort} points</strong> across ${rollups.length} workstreams.` : ''}
  </p>
</div>

<!-- LEVEL READINESS (compact) -->
<div class="kpis" style="margin-top:20px">
  ${levels.map((l: any, i: number) => {
    const r = levelReadiness(l);
    return `<div class="kpi">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.5px;color:#888;margin-bottom:4px">${l.code || `L${i+1}`} ${l.name}</div>
      <div class="v" style="color:${MATURITY_COLORS[Math.min(4, Math.round(r.currentPct / 25))]}">${r.currentPct}%</div>
      <div class="bar-h" style="margin-top:6px"><div class="bar-fill" style="width:${r.currentPct}%;background:${MATURITY_COLORS[Math.min(4, Math.round(r.currentPct / 25))]}"></div></div>
      <div class="l">${r.scored}/${r.total} scored · Wt ${Math.round(((l.weight || 1) / totalWt) * 100)}%</div>
    </div>`;
  }).join('')}
</div>

<!-- TRAFFIC LIGHT SUMMARY -->
<h2>Assessment at a Glance</h2>
<div class="traffic">
  <div class="traffic-col" style="border-color:#C8472E;background:#C8472E08">
    <h4 style="color:#C8472E">Critical Gaps</h4>
    <div class="count" style="color:#C8472E">${criticalGaps.length}</div>
    <ul>${criticalGaps.slice(0, 5).map(g => `<li style="color:#555"><span style="position:absolute;left:0;top:6px;width:5px;height:5px;border-radius:50%;background:#C8472E;-webkit-print-color-adjust:exact;print-color-adjust:exact"></span>${g.dimensionName} (&#916;${g.gap})</li>`).join('')}
    ${criticalGaps.length > 5 ? `<li style="color:#999">+${criticalGaps.length - 5} more</li>` : ''}</ul>
  </div>
  <div class="traffic-col" style="border-color:#f59e0b;background:#f59e0b08">
    <h4 style="color:#f59e0b">Moderate Gaps</h4>
    <div class="count" style="color:#f59e0b">${moderateGaps.length + lowGaps.filter(g => g.priority).length}</div>
    <ul>${[...moderateGaps, ...lowGaps.filter(g => g.priority)].slice(0, 5).map(g => `<li style="color:#555"><span style="position:absolute;left:0;top:6px;width:5px;height:5px;border-radius:50%;background:#f59e0b;-webkit-print-color-adjust:exact;print-color-adjust:exact"></span>${g.dimensionName} (&#916;${g.gap})</li>`).join('')}</ul>
  </div>
  <div class="traffic-col" style="border-color:#22c55e;background:#22c55e08">
    <h4 style="color:#22c55e">Strengths</h4>
    <div class="count" style="color:#22c55e">${strengthDims.length}</div>
    <ul>${strengthDims.slice(0, 5).map((d: any) => `<li style="color:#555"><span style="position:absolute;left:0;top:6px;width:5px;height:5px;border-radius:50%;background:#22c55e;-webkit-print-color-adjust:exact;print-color-adjust:exact"></span>${d.name} (${MATURITY[d.currentScore]})</li>`).join('')}
    ${strengthDims.length === 0 ? '<li style="color:#ccc">None at Governed+</li>' : ''}</ul>
  </div>
</div>

<!-- KEY FINDINGS -->
<h2>Key Findings</h2>
${topFindings.slice(0, 5).map((g, i) => `<div class="finding-card">
  <div class="finding-num">${i + 1}</div>
  <div style="flex:1">
    <div style="font-weight:600;font-size:13px">${g.dimensionName} ${severityChip(g.gap, g.priority)}</div>
    <div style="font-size:12px;color:#555;margin-top:4px;line-height:1.6">${g.finding || `Currently at ${MATURITY[g.current]} (${g.current}/4), targeting ${MATURITY[g.target]} (${g.target}/4). A ${g.gap}-level gap indicates ${g.gap >= 3 ? 'critical underinvestment' : 'needed improvement'} in this area.`}</div>
  </div>
</div>`).join('')}

<!-- STRATEGIC IMPLICATIONS -->
<h2>Strategic Implications</h2>
<div class="card" style="background:#f8f9fa">
  <ul style="padding-left:20px;font-size:13px;line-height:1.8">
    ${criticalGaps.length > 0 ? `<li><strong>${criticalGaps.length} critical gap${criticalGaps.length !== 1 ? 's' : ''}</strong> across ${[...new Set(criticalGaps.map(g => g.workstreamCode))].filter(Boolean).length || 'multiple'} workstreams require immediate investment to de-risk the transformation.</li>` : '<li>No critical gaps identified — the organization has a solid foundation to build upon.</li>'}
    ${(() => {
      const weakestLevel = levels.map((l: any) => ({ name: l.name, code: l.code, pct: levelReadiness(l).currentPct })).sort((a: any, b: any) => a.pct - b.pct)[0];
      return weakestLevel ? `<li><strong>${weakestLevel.code || ''} ${weakestLevel.name}</strong> at ${weakestLevel.pct}% is the weakest level and represents the primary constraint on overall readiness.</li>` : '';
    })()}
    ${useCases.length > 0 ? `<li>${useCases.filter((u: any) => u.value >= 4 && u.feasibility >= 4).length} use cases score high on both value and feasibility — these are natural pilot candidates for early wins.</li>` : ''}
    ${rollups.length > 0 ? `<li>Investment should prioritize ${rollups.slice(0, 2).map(ws => `<strong>${ws.code} ${ws.name}</strong>`).join(' and ')} which carry the highest gap concentration.</li>` : ''}
  </ul>
</div>

<!-- INVESTMENT ASK -->
<h2>Investment Summary</h2>
<div class="kpis">
  <div class="kpi"><div class="v" style="color:#0A867F">${totalEffort}</div><div class="l">Total Effort Points</div></div>
  <div class="kpi"><div class="v" style="color:#7c3aed">${scopeItems.length || gaps.length}</div><div class="l">Scope Items</div></div>
  <div class="kpi"><div class="v">${rollups.length}</div><div class="l">Workstreams</div></div>
  <div class="kpi"><div class="v">${[...new Set(scopeItems.map((s: any) => s.phase || 'P1'))].length || 3}</div><div class="l">Phases</div></div>
</div>

<!-- RECOMMENDED NEXT STEPS -->
<h2>Recommended Next Steps</h2>
${[
  criticalGaps.length > 0 ? `Convene a steering committee to review ${criticalGaps.length} critical gaps and assign executive sponsors.` : 'Validate assessment results with key stakeholders and confirm target maturity levels.',
  rollups.length > 0 ? `Prioritize ${rollups[0]?.code || ''} ${rollups[0]?.name || 'the highest-impact workstream'} for immediate Phase 1 execution.` : 'Define workstream structure and assign owners for gap closure initiatives.',
  'Establish a governance cadence: monthly steering reviews, bi-weekly delivery stand-ups.',
  useCases.filter((u: any) => u.isPilot).length > 0 ? `Launch ${useCases.filter((u: any) => u.isPilot).length} selected pilot use case${useCases.filter((u: any) => u.isPilot).length !== 1 ? 's' : ''} to demonstrate value within 30 days.` : 'Identify 2-3 pilot use cases for rapid value demonstration.',
  `Schedule a maturity re-assessment in 90 days to measure progress from the ${stats.index}/100 baseline.`,
].map((step, i) => `<div class="step">
  <div class="step-num">${i + 1}</div>
  <div style="flex:1;font-size:13px;line-height:1.6">${step}</div>
</div>`).join('')}

<div class="footer">
  ${workshop.customerName} — Executive Briefing · ${date} · Galent SalesPilot · Confidential
</div>
</div>
</body></html>`;
}

// ═══════ GAP ANALYSIS REPORT (comprehensive gap document) ═══════
export function generateGapAnalysisHTML(workshop: any): string {
  const stats = workshopStats(workshop);
  const gaps = gapsForWorkshop(workshop);
  const levels = workshop.framework?.levels || [];
  const workstreams = workshop.framework?.workstreams || [];
  const scopeItems = workshop.scopeItems || [];
  const rollups = rollupByWorkstream(gaps, workstreams, scopeItems);
  const allDims = levels.flatMap((l: any) => l.dimensions || []);
  const scored = allDims.filter((d: any) => d.currentScore != null);
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const criticalGaps = gaps.filter(g => g.gap >= 3 || (g.gap >= 2 && g.priority));
  const highGaps = gaps.filter(g => g.gap === 2 && !g.priority);
  const medGaps = gaps.filter(g => g.gap === 1 && g.priority);
  const lowGaps = gaps.filter(g => g.gap === 1 && !g.priority);
  const priorityGaps = gaps.filter(g => g.priority);
  const avgGap = gaps.length > 0 ? gaps.reduce((s, g) => s + g.gap, 0) / gaps.length : 0;
  const quickWins = gaps.filter(g => g.gap === 1 && !g.priority);
  const strategicGaps = gaps.filter(g => g.gap >= 3);
  const topGaps = [...gaps].sort((a, b) => b.gap - a.gap || (b.priority ? 1 : 0) - (a.priority ? 1 : 0));

  // Severity distribution for SVG bar chart
  const sevDist = [
    { label: 'Critical', count: criticalGaps.length, color: '#C8472E' },
    { label: 'High', count: highGaps.length, color: '#D97A2B' },
    { label: 'Medium', count: medGaps.length, color: '#f59e0b' },
    { label: 'Low', count: lowGaps.length, color: '#22c55e' },
  ];
  const maxSev = Math.max(...sevDist.map(s => s.count), 1);

  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${workshop.customerName} — Gap Analysis</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
<style>${SHARED_CSS}
.heatmap-row{display:flex;gap:3px;align-items:center;margin:4px 0}
.heatmap-cell{width:36px;height:36px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.heatmap-label{font-size:10px;width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gap-rank{width:28px;height:28px;border-radius:14px;background:#0B1120;color:#0FB5AD;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.closure-item{display:flex;gap:12px;padding:12px 0;border-bottom:1px solid #f0f0f0;align-items:flex-start}
</style>
</head><body>
<div class="page">

<!-- HERO -->
<div class="hero" style="background:linear-gradient(135deg,#0B1120,#2d1a3e)">
  <div style="font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.35);margin-bottom:6px">Comprehensive Gap Analysis</div>
  <h1>${workshop.customerName}</h1>
  <div class="sub">${workshop.title} · ${date}</div>
  <div style="display:flex;gap:12px;margin-top:16px;flex-wrap:wrap">
    ${[
      { v: gaps.length, l: 'Total Gaps', c: gaps.length > 0 ? '#D97A2B' : '#22c55e' },
      { v: criticalGaps.length, l: 'Critical', c: '#C8472E' },
      { v: priorityGaps.length, l: 'Priority', c: '#f59e0b' },
      { v: avgGap.toFixed(1), l: 'Avg Gap Size', c: '#fff' },
      { v: `${stats.dimensionsScored}/${stats.totalDimensions}`, l: 'Scored', c: '#fff' },
    ].map(k => `<div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:8px 14px;text-align:center">
      <div style="font-size:18px;font-weight:700;color:${k.c};font-family:'Space Grotesk',sans-serif">${k.v}</div>
      <div style="font-size:8px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.5px">${k.l}</div>
    </div>`).join('')}
  </div>
</div>

<!-- NAV -->
<div class="nav">
  <a href="#dashboard">Dashboard</a>
  <a href="#full-table">Full Gap Table</a>
  <a href="#heatmap">Heatmap</a>
  <a href="#cross-domain">Cross-Domain</a>
  <a href="#dependencies">Dependencies</a>
  <a href="#quick-wins">Quick Wins</a>
  <a href="#strategic">Strategic Gaps</a>
  <a href="#closure">Closure Timeline</a>
  <a href="#measurement">Measurement</a>
</div>

<!-- GAP SUMMARY DASHBOARD -->
<h2 id="dashboard">Gap Summary Dashboard</h2>
<div class="two-col">
  <div class="card">
    <h3>Severity Distribution</h3>
    <div style="margin-top:12px">
      ${sevDist.map(s => `<div style="display:flex;align-items:center;gap:8px;margin:8px 0">
        <span style="font-size:11px;width:55px;color:${s.color};font-weight:600">${s.label}</span>
        <div style="flex:1;height:12px;background:#e9ecef;border-radius:6px;overflow:hidden">
          <div style="height:100%;width:${(s.count / maxSev) * 100}%;background:${s.color};border-radius:6px;-webkit-print-color-adjust:exact;print-color-adjust:exact"></div>
        </div>
        <span style="font-size:13px;font-weight:700;width:24px;text-align:right;color:${s.color}">${s.count}</span>
      </div>`).join('')}
    </div>
    <div style="text-align:center;margin-top:12px;font-size:12px;color:#666">
      ${gaps.length} total gaps · ${priorityGaps.length} flagged priority
    </div>
  </div>
  <div class="card">
    <h3>Gap Statistics</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
      <div style="text-align:center;padding:12px;background:#f8f9fa;border-radius:8px">
        <div style="font-size:24px;font-weight:700;font-family:'Space Grotesk',sans-serif;color:#0B1120">${gaps.length}</div>
        <div style="font-size:9px;color:#888;text-transform:uppercase">Total Gaps</div>
      </div>
      <div style="text-align:center;padding:12px;background:#f8f9fa;border-radius:8px">
        <div style="font-size:24px;font-weight:700;font-family:'Space Grotesk',sans-serif;color:#D97A2B">${avgGap.toFixed(1)}</div>
        <div style="font-size:9px;color:#888;text-transform:uppercase">Avg Gap Size</div>
      </div>
      <div style="text-align:center;padding:12px;background:#f8f9fa;border-radius:8px">
        <div style="font-size:24px;font-weight:700;font-family:'Space Grotesk',sans-serif;color:#C8472E">${criticalGaps.length}</div>
        <div style="font-size:9px;color:#888;text-transform:uppercase">Critical</div>
      </div>
      <div style="text-align:center;padding:12px;background:#f8f9fa;border-radius:8px">
        <div style="font-size:24px;font-weight:700;font-family:'Space Grotesk',sans-serif;color:#f59e0b">${priorityGaps.length}</div>
        <div style="font-size:9px;color:#888;text-transform:uppercase">Priority</div>
      </div>
    </div>
    <div style="margin-top:12px">
      <div style="display:flex;height:12px;border-radius:6px;overflow:hidden">
        ${sevDist.filter(s => s.count > 0).map(s => `<div style="width:${gaps.length > 0 ? (s.count / gaps.length) * 100 : 0}%;background:${s.color};-webkit-print-color-adjust:exact;print-color-adjust:exact"></div>`).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:4px">
        ${sevDist.filter(s => s.count > 0).map(s => `<span style="font-size:8px;color:${s.color}">${s.label} ${Math.round(gaps.length > 0 ? (s.count / gaps.length) * 100 : 0)}%</span>`).join('')}
      </div>
    </div>
  </div>
</div>

<!-- FULL GAP TABLE -->
<h2 id="full-table">Full Gap Inventory</h2>
<div class="card" style="overflow-x:auto">
  ${gaps.length === 0 ? '<p style="font-size:13px;color:#888">No gaps identified. All scored dimensions meet or exceed their targets.</p>' : `
  <table class="tbl">
    <thead><tr><th>#</th><th>Dimension</th><th>Level</th><th>Workstream</th><th>Current</th><th>Target</th><th>Gap</th><th>Severity</th><th>Priority</th><th>Finding / Recommended Action</th></tr></thead>
    <tbody>${topGaps.map((g, i) => {
      const parentLevel = levels.find((l: any) => l.id === g.levelId);
      return `<tr>
        <td style="text-align:center"><div class="gap-rank">${i + 1}</div></td>
        <td><strong>${g.dimensionName}</strong></td>
        <td style="font-family:monospace;font-size:10px;color:#666">${parentLevel?.code || '—'}</td>
        <td style="font-family:monospace;font-size:10px;color:#7c3aed">${g.workstreamCode || '—'}</td>
        <td>${maturityChipHTML(g.current)}</td>
        <td>${maturityChipHTML(g.target)}</td>
        <td style="text-align:center;font-weight:700;font-size:14px;font-family:'Space Grotesk',sans-serif;color:${g.gap >= 3 ? '#C8472E' : g.gap >= 2 ? '#D97A2B' : '#f59e0b'}">${g.gap}</td>
        <td>${severityChip(g.gap, g.priority)}</td>
        <td style="text-align:center">${g.priority ? '<span style="color:#D97A2B;font-weight:700">&#9873;</span>' : ''}</td>
        <td style="font-size:11px;color:#555;max-width:220px">${g.finding ? g.finding.slice(0, 130) + (g.finding.length > 130 ? '...' : '') : `Advance from ${MATURITY[g.current]} to ${MATURITY[g.target]}`}</td>
      </tr>`;
    }).join('')}</tbody>
  </table>`}
</div>

<!-- PER-LEVEL GAP HEATMAP -->
<h2 id="heatmap">Per-Level Gap Heatmap</h2>
<div class="card">
  <p style="font-size:11px;color:#888;margin-bottom:12px">Each cell represents a dimension. Color intensity indicates gap severity. Green = on target, amber = small gap, red = critical gap, gray = not scored.</p>
  ${levels.map((level: any, li: number) => {
    const dims = level.dimensions || [];
    return `
    <div style="margin-bottom:16px">
      <div style="font-weight:600;font-size:12px;margin-bottom:6px">${level.code || `L${li+1}`} ${level.name}</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px">
        ${dims.map((d: any) => {
          let bg = '#e9ecef'; // not scored
          let fg = '#999';
          let label = '—';
          if (d.currentScore != null) {
            if (d.targetScore != null && d.targetScore > d.currentScore) {
              const gap = d.targetScore - d.currentScore;
              bg = gap >= 3 ? '#C8472E' : gap >= 2 ? '#D97A2B' : gap >= 1 && d.priority ? '#f59e0b' : '#fbbf24';
              fg = gap >= 2 ? '#fff' : '#333';
              label = `&#916;${gap}`;
            } else {
              bg = '#22c55e20';
              fg = '#22c55e';
              label = '&#10003;';
            }
          }
          return `<div class="heatmap-cell" style="background:${bg};color:${fg}" title="${d.name}: ${d.currentScore != null ? MATURITY[d.currentScore] : 'Not scored'}${d.targetScore != null ? ' → ' + MATURITY[d.targetScore] : ''}">${label}</div>`;
        }).join('')}
      </div>
      <div style="display:flex;gap:4px;margin-top:2px">
        ${dims.map((d: any) => `<div style="width:36px;font-size:7px;color:#999;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${d.name}">${(d.code || d.name || '').slice(0, 5)}</div>`).join('')}
      </div>
    </div>`;
  }).join('')}
  <div style="display:flex;gap:12px;margin-top:8px;justify-content:center;font-size:9px;color:#888">
    <span><span class="heatmap-cell" style="width:14px;height:14px;font-size:0;background:#e9ecef;display:inline-flex"></span> Not scored</span>
    <span><span class="heatmap-cell" style="width:14px;height:14px;font-size:0;background:#22c55e20;display:inline-flex"></span> On target</span>
    <span><span class="heatmap-cell" style="width:14px;height:14px;font-size:0;background:#fbbf24;display:inline-flex"></span> Low gap</span>
    <span><span class="heatmap-cell" style="width:14px;height:14px;font-size:0;background:#f59e0b;display:inline-flex"></span> Medium</span>
    <span><span class="heatmap-cell" style="width:14px;height:14px;font-size:0;background:#D97A2B;display:inline-flex"></span> High</span>
    <span><span class="heatmap-cell" style="width:14px;height:14px;font-size:0;background:#C8472E;display:inline-flex"></span> Critical</span>
  </div>
</div>

<!-- CROSS-DOMAIN ANALYSIS -->
<h2 id="cross-domain">Cross-Domain Analysis</h2>
<div class="card">
  <p style="font-size:12px;color:#666;margin-bottom:12px">Gap concentration by workstream — which areas carry the most transformation debt.</p>
  ${rollups.length === 0 ? '<p style="font-size:12px;color:#888">No workstream rollups available.</p>' : `
  ${rollups.sort((a, b) => b.gaps.length - a.gaps.length).map((ws, i) => {
    const colors = ['#7c3aed', '#3b82f6', '#0A867F', '#f59e0b', '#C8472E', '#22c55e', '#6E97C2', '#D97A2B'];
    const wsColor = colors[i % colors.length];
    const wsCrit = ws.gaps.filter(g => g.gap >= 3 || (g.gap >= 2 && g.priority)).length;
    return `<div style="display:flex;align-items:center;gap:12px;margin:10px 0;padding:8px 0;border-bottom:1px solid #f5f5f5">
      <span style="font-family:monospace;font-weight:700;color:${wsColor};font-size:12px;width:36px">${ws.code}</span>
      <div style="flex:1">
        <div style="font-weight:600;font-size:12px">${ws.name}</div>
        <div style="display:flex;height:8px;border-radius:4px;overflow:hidden;margin-top:4px">
          ${ws.gaps.filter(g => g.gap >= 3 || (g.gap >= 2 && g.priority)).length > 0 ? `<div style="width:${(ws.gaps.filter(g => g.gap >= 3 || (g.gap >= 2 && g.priority)).length / ws.gaps.length) * 100}%;background:#C8472E;-webkit-print-color-adjust:exact;print-color-adjust:exact"></div>` : ''}
          ${ws.gaps.filter(g => g.gap === 2 && !g.priority).length > 0 ? `<div style="width:${(ws.gaps.filter(g => g.gap === 2 && !g.priority).length / ws.gaps.length) * 100}%;background:#D97A2B;-webkit-print-color-adjust:exact;print-color-adjust:exact"></div>` : ''}
          ${ws.gaps.filter(g => g.gap === 1).length > 0 ? `<div style="width:${(ws.gaps.filter(g => g.gap === 1).length / ws.gaps.length) * 100}%;background:#f59e0b;-webkit-print-color-adjust:exact;print-color-adjust:exact"></div>` : ''}
        </div>
      </div>
      <span style="font-size:12px;font-weight:600;width:55px;text-align:right">${ws.gaps.length} gaps</span>
      <span style="font-size:11px;color:#C8472E;width:50px;text-align:right">${wsCrit} crit</span>
      <span style="font-size:11px;color:#888;width:50px;text-align:right">${ws.totalEffort} pts</span>
    </div>`;
  }).join('')}`}
</div>

<!-- DEPENDENCY MAP -->
<h2 id="dependencies">Dependency Map</h2>
<div class="card">
  <p style="font-size:12px;color:#666;margin-bottom:12px">Gaps that depend on closing other gaps first, based on workstream and severity relationships.</p>
  ${(() => {
    // Foundation gaps (critical + priority) must be closed before dependent moderate gaps
    const foundation = criticalGaps.sort((a, b) => b.gap - a.gap);
    const dependent = highGaps.filter(g => foundation.some(f => f.workstreamCode === g.workstreamCode));
    if (foundation.length === 0) return '<p style="font-size:12px;color:#888">No foundation dependencies identified — all gaps can be addressed in parallel.</p>';
    return `<table class="tbl">
      <thead><tr><th>Foundation Gap (close first)</th><th>Severity</th><th>Dependent Gaps</th><th>Workstream</th></tr></thead>
      <tbody>${foundation.map(f => {
        const deps = gaps.filter(g => g.workstreamCode === f.workstreamCode && g.dimensionId !== f.dimensionId && g.gap < f.gap);
        return `<tr>
          <td><strong>${f.dimensionName}</strong></td>
          <td>${severityChip(f.gap, f.priority)}</td>
          <td style="font-size:11px">${deps.length > 0 ? deps.map(d => d.dimensionName).join(', ') : '<span style="color:#888">Independent</span>'}</td>
          <td style="font-family:monospace;font-size:10px;color:#7c3aed">${f.workstreamCode || '—'}</td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;
  })()}
</div>

<!-- QUICK WINS -->
<h2 id="quick-wins">Quick Wins</h2>
<div class="card" style="border-left:4px solid #22c55e">
  <p style="font-size:12px;color:#666;margin-bottom:12px">Gaps with size = 1 and no priority flag — single-level improvements achievable with minimal investment.</p>
  ${quickWins.length === 0 ? '<p style="font-size:12px;color:#888">No quick wins identified.</p>' : `
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:8px">
    ${quickWins.map(g => `<div style="display:flex;align-items:center;gap:8px;padding:8px;border:1px solid #22c55e20;border-radius:8px;background:#22c55e05">
      <span style="width:8px;height:8px;border-radius:4px;background:#22c55e;flex-shrink:0;-webkit-print-color-adjust:exact;print-color-adjust:exact"></span>
      <div style="flex:1;font-size:12px"><strong>${g.dimensionName}</strong></div>
      <span style="font-size:10px;color:#888">${MATURITY[g.current].slice(0,3)} &#8594; ${MATURITY[g.target].slice(0,3)}</span>
    </div>`).join('')}
  </div>`}
</div>

<!-- STRATEGIC GAPS -->
<h2 id="strategic">Strategic Gaps</h2>
<div class="card" style="border-left:4px solid #7c3aed">
  <p style="font-size:12px;color:#666;margin-bottom:12px">Gaps with size &#8805; 3 requiring organizational transformation and multi-phase investment.</p>
  ${strategicGaps.length === 0 ? '<p style="font-size:12px;color:#888">No strategic gaps (&#916; &#8805; 3) identified.</p>' : `
  ${strategicGaps.sort((a, b) => b.gap - a.gap).map(g => `<div style="padding:12px 0;border-bottom:1px solid #f0f0f0">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
      <strong style="font-size:14px;flex:1">${g.dimensionName}</strong>
      ${severityChip(g.gap, g.priority)}
      <span style="font-family:monospace;font-size:11px;color:#7c3aed">${g.workstreamCode || ''}</span>
    </div>
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
      ${maturityChipHTML(g.current)}
      <span style="color:#888;font-size:11px">&#8594; &#8594; &#8594;</span>
      ${maturityChipHTML(g.target)}
      <span style="font-size:11px;color:#888">(${g.gap}-level advancement)</span>
    </div>
    <div style="font-size:12px;color:#555;line-height:1.6">${g.finding || `This ${g.gap}-level gap requires fundamental organizational change. Moving from ${MATURITY[g.current]} to ${MATURITY[g.target]} involves establishing new processes, capabilities, and governance structures.`}</div>
    <div style="font-size:11px;color:#7c3aed;margin-top:6px"><strong>Approach:</strong> Multi-phase transformation over ${g.gap <= 3 ? '6-9' : '9-12'} months with dedicated ownership and executive sponsorship.</div>
  </div>`).join('')}`}
</div>

<!-- GAP CLOSURE TIMELINE -->
<h2 id="closure">Gap Closure Timeline</h2>
<div class="card">
  <p style="font-size:12px;color:#666;margin-bottom:16px">Phased plan to close the top ${Math.min(10, gaps.length)} gaps by severity:</p>
  ${topGaps.slice(0, 10).map((g, i) => {
    const phase = g.gap >= 3 ? 'P1-P3' : g.gap >= 2 ? 'P1-P2' : 'P1';
    const phaseColor = g.gap >= 3 ? '#7c3aed' : g.gap >= 2 ? '#3b82f6' : '#22c55e';
    const timeline = g.gap >= 3 ? '6-12 months' : g.gap >= 2 ? '3-6 months' : '0-3 months';
    return `<div class="closure-item">
      <div class="gap-rank">${i + 1}</div>
      <div style="flex:1">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <strong style="font-size:13px">${g.dimensionName}</strong>
          ${severityChip(g.gap, g.priority)}
        </div>
        <div style="display:flex;gap:12px;font-size:11px;color:#888">
          <span>${maturityChipHTML(g.current)} &#8594; ${maturityChipHTML(g.target)}</span>
          <span style="font-family:monospace;color:#7c3aed">${g.workstreamCode || '—'}</span>
        </div>
      </div>
      <div style="text-align:right">
        <span class="chip" style="background:${phaseColor}15;color:${phaseColor}">${phase}</span>
        <div style="font-size:10px;color:#888;margin-top:2px">${timeline}</div>
      </div>
    </div>`;
  }).join('')}
</div>

<!-- MEASUREMENT FRAMEWORK -->
<h2 id="measurement">Measurement Framework</h2>
<div class="card">
  <p style="font-size:12px;color:#666;margin-bottom:12px">How to track gap closure progress — key performance indicators per gap category.</p>
  <table class="tbl">
    <thead><tr><th>KPI</th><th>Baseline</th><th>Target</th><th>Frequency</th><th>Owner</th></tr></thead>
    <tbody>
      <tr>
        <td><strong>Overall Readiness Index</strong></td>
        <td style="font-weight:600">${stats.index}/100</td>
        <td style="font-weight:600;color:#0A867F">${Math.min(100, stats.index + Math.round(gaps.reduce((s, g) => s + g.gap * 5, 0)))}/100</td>
        <td>Monthly</td>
        <td>Program Lead</td>
      </tr>
      <tr>
        <td><strong>Critical Gaps Remaining</strong></td>
        <td style="font-weight:600;color:#C8472E">${criticalGaps.length}</td>
        <td style="font-weight:600;color:#22c55e">0</td>
        <td>Bi-weekly</td>
        <td>Steering Committee</td>
      </tr>
      <tr>
        <td><strong>Average Gap Size</strong></td>
        <td style="font-weight:600">${avgGap.toFixed(1)} levels</td>
        <td style="font-weight:600;color:#22c55e">&lt; 0.5</td>
        <td>Monthly</td>
        <td>Program Lead</td>
      </tr>
      <tr>
        <td><strong>Dimensions at Governed+</strong></td>
        <td style="font-weight:600">${scored.filter((d: any) => d.currentScore >= 3).length}/${scored.length}</td>
        <td style="font-weight:600;color:#0A867F">${Math.min(scored.length, scored.filter((d: any) => d.currentScore >= 3).length + gaps.length)}/${scored.length}</td>
        <td>Quarterly</td>
        <td>Assessment Lead</td>
      </tr>
      <tr>
        <td><strong>Scope Items Completed</strong></td>
        <td style="font-weight:600">0</td>
        <td style="font-weight:600;color:#0A867F">${scopeItems.length || gaps.length}</td>
        <td>Bi-weekly</td>
        <td>Delivery Leads</td>
      </tr>
    </tbody>
  </table>
  <details style="margin-top:12px">
    <summary>Per-Dimension Tracking</summary>
    <table class="tbl" style="margin-top:8px">
      <thead><tr><th>Dimension</th><th>Baseline</th><th>Target</th><th>Gap to Close</th><th>Workstream</th></tr></thead>
      <tbody>${topGaps.map(g => `<tr>
        <td style="font-size:12px">${g.dimensionName}</td>
        <td>${maturityChipHTML(g.current)}</td>
        <td>${maturityChipHTML(g.target)}</td>
        <td style="text-align:center;font-weight:600;color:${g.gap >= 3 ? '#C8472E' : g.gap >= 2 ? '#D97A2B' : '#f59e0b'}">&#916;${g.gap}</td>
        <td style="font-family:monospace;font-size:10px;color:#7c3aed">${g.workstreamCode || '—'}</td>
      </tr>`).join('')}</tbody>
    </table>
  </details>
</div>

<div class="footer">
  ${workshop.customerName} — Gap Analysis · ${date} · Galent SalesPilot · Confidential
</div>
</div>
</body></html>`;
}
