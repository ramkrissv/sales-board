/**
 * Workshop Export — generates downloadable reports.
 * Supports: HTML (rich, printable), Markdown (copyable), and browser Print → PDF.
 */
import { workshopStats, gapsForWorkshop, levelReadiness } from './scoring';
import { MATURITY_LABELS as MATURITY, MATURITY_COLORS, EXEC_LABELS } from './constants';

export function generateFindingsHTML(workshop: any, options: { recommendations?: string[]; narrative?: string } = {}): string {
  const stats = workshopStats(workshop);
  const gaps = gapsForWorkshop(workshop);
  const levels = workshop.framework?.levels || [];
  const topGaps = gaps.sort((a, b) => b.gap - a.gap).slice(0, 10);

  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${workshop.customerName} — Workshop Findings</title>
<style>
  body { font-family: 'Inter', system-ui, sans-serif; max-width: 900px; margin: 40px auto; color: #1a1a2e; line-height: 1.6; padding: 0 24px; }
  h1 { color: #0A867F; font-size: 28px; border-bottom: 3px solid #0A867F; padding-bottom: 12px; }
  h2 { color: #0B1120; margin-top: 36px; font-size: 20px; }
  h3 { color: #333; font-size: 16px; margin-top: 24px; }
  .hero { background: #0B1120; color: white; padding: 32px; border-radius: 16px; margin-bottom: 32px; }
  .hero h1 { color: #0FB5AD; border: none; margin: 0; }
  .hero .subtitle { color: rgba(255,255,255,0.6); font-size: 14px; margin-top: 8px; }
  .hero .index { font-size: 64px; font-weight: 800; color: #0FB5AD; }
  .hero .stage { font-size: 16px; color: #0FB5AD; opacity: 0.8; }
  .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 24px 0; }
  .kpi { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 12px; padding: 16px; text-align: center; }
  .kpi .value { font-size: 28px; font-weight: 700; color: #0A867F; }
  .kpi .label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
  .level-card { border: 1px solid #e9ecef; border-radius: 12px; padding: 20px; margin: 16px 0; }
  .level-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
  .level-badge { background: #0B1120; color: #0FB5AD; width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; }
  .level-bar { height: 8px; background: #e9ecef; border-radius: 4px; overflow: hidden; margin: 8px 0; }
  .level-fill { height: 100%; border-radius: 4px; background: linear-gradient(90deg, #6E97C2, #0A867F); }
  .gap-row { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
  .gap-row:last-child { border-bottom: none; }
  .gap-badge { font-weight: 700; font-size: 14px; min-width: 32px; text-align: center; }
  .gap-cells { display: flex; gap: 2px; }
  .gap-cell { width: 12px; height: 12px; border-radius: 3px; }
  .rec { display: flex; gap: 8px; padding: 8px 0; font-size: 13px; }
  .rec-num { width: 24px; height: 24px; border-radius: 12px; background: #7c3aed; color: white; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
  .narrative { background: #f8fffe; border-left: 4px solid #0A867F; padding: 20px; border-radius: 0 12px 12px 0; margin: 24px 0; font-size: 14px; line-height: 1.8; }
  .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e9ecef; font-size: 11px; color: #999; text-align: center; }
  @media print {
    body { margin: 20px; }
    .hero { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .level-fill, .gap-cell, .rec-num, .level-badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head><body>

<div class="hero">
  <div style="display:flex;align-items:center;gap:24px;">
    <div style="text-align:center;">
      <div class="index">${stats.index}</div>
      <div class="stage">${stats.stage}</div>
    </div>
    <div style="flex:1;">
      <h1>${workshop.customerName}</h1>
      <div class="subtitle">${workshop.title}</div>
      <div class="subtitle" style="margin-top:8px;">
        ${stats.dimensionsScored}/${stats.totalDimensions} dimensions scored ·
        ${stats.gapCount} gaps (${stats.priorityGapCount} priority) ·
        ${stats.useCaseCount} use cases · ${stats.pilotCount} pilots
      </div>
    </div>
  </div>
</div>

<div class="kpi-row">
  <div class="kpi"><div class="value">${stats.index}/100</div><div class="label">Readiness Index</div></div>
  <div class="kpi"><div class="value">${stats.gapCount}</div><div class="label">Gaps Identified</div></div>
  <div class="kpi"><div class="value">${stats.scopeItemCount}</div><div class="label">Scope Items</div></div>
  <div class="kpi"><div class="value">${stats.pilotCount}</div><div class="label">Pilots Selected</div></div>
</div>

<h2>Level Readiness</h2>
${levels.map((level: any) => {
  const r = levelReadiness(level);
  const dims = (level.dimensions || []).filter((d: any) => d.currentScore != null);
  return `
<div class="level-card">
  <div class="level-header">
    <div class="level-badge">${level.id}</div>
    <div style="flex:1;">
      <div style="font-weight:600;font-size:15px;">${level.name}</div>
      <div style="font-size:12px;color:#666;">${r.scored}/${r.total} scored · Weight: ${Math.round((level.weight || 0) * 100)}%</div>
    </div>
    <div style="font-size:24px;font-weight:700;color:#0A867F;">${r.currentPct}%</div>
  </div>
  <div class="level-bar"><div class="level-fill" style="width:${r.currentPct}%"></div></div>
  ${dims.filter((d: any) => d.finding?.body).slice(0, 3).map((d: any) => `
    <div style="font-size:12px;color:#555;margin-top:6px;padding-left:48px;">
      <strong>${d.id}</strong> ${d.finding.body.slice(0, 150)}${d.finding.body.length > 150 ? '...' : ''}
    </div>
  `).join('')}
</div>`;
}).join('')}

<h2>Top Gaps</h2>
${topGaps.map(g => `
<div class="gap-row">
  <span style="font-family:monospace;color:#666;min-width:30px;">${g.dimensionId}</span>
  <span style="flex:1;">${g.dimensionName}</span>
  <div class="gap-cells">
    ${[0,1,2,3,4].map(i => `<div class="gap-cell" style="background:${i <= g.current ? MATURITY_COLORS[i] : i <= g.target ? '#D97A2B30' : '#e9ecef'};${i === g.target ? 'border:2px solid #D97A2B;' : ''}"></div>`).join('')}
  </div>
  <span class="gap-badge" style="color:${g.gap >= 3 ? '#C8472E' : g.gap >= 2 ? '#D97A2B' : '#3A93A0'}">+${g.gap}</span>
</div>
`).join('')}

${options.narrative ? `
<h2>Current State Assessment</h2>
<div class="narrative">${options.narrative.replace(/\n/g, '<br>')}</div>
` : ''}

${(options.recommendations || []).length > 0 ? `
<h2>Key Recommendations</h2>
${(options.recommendations || []).map((rec, i) => `
<div class="rec">
  <div class="rec-num">${i + 1}</div>
  <div>${rec}</div>
</div>
`).join('')}
` : ''}

<div class="footer">
  ${workshop.customerName} — Workshop Findings · Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} · Galent SalesPilot
</div>
</body></html>`;
}

export function generateProposalHTML(workshop: any, proposal: any): string {
  const stats = workshopStats(workshop);
  const gaps = gapsForWorkshop(workshop);

  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><title>${proposal.title || workshop.customerName + ' — Proposal'}</title>
<style>
  body { font-family: 'Inter', system-ui, sans-serif; max-width: 900px; margin: 40px auto; color: #1a1a2e; line-height: 1.6; padding: 0 24px; }
  h1 { color: #0A867F; font-size: 24px; }
  h2 { color: #0B1120; margin-top: 32px; font-size: 18px; border-bottom: 1px solid #e9ecef; padding-bottom: 8px; }
  .hero { background: #0B1120; color: white; padding: 32px; border-radius: 16px; margin-bottom: 32px; }
  .hero h1 { color: #0FB5AD; border: none; margin: 0; font-size: 24px; }
  .module { border: 1px solid #e9ecef; border-radius: 12px; padding: 20px; margin: 16px 0; page-break-inside: avoid; }
  .module-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
  .ws-badge { background: #0B1120; color: white; padding: 4px 10px; border-radius: 6px; font-family: monospace; font-size: 12px; font-weight: 700; }
  .exec-badge { background: #7c3aed15; color: #7c3aed; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
  .scope-item { padding-left: 16px; position: relative; margin: 4px 0; font-size: 13px; }
  .scope-item::before { content: ""; position: absolute; left: 2px; top: 8px; width: 6px; height: 6px; border-radius: 2px; background: #0A867F; }
  .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e9ecef; font-size: 11px; color: #999; text-align: center; }
  @media print { .hero { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .ws-badge, .exec-badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head><body>
<div class="hero">
  <h1>${proposal.title || workshop.customerName + ' — Commercial Proposal'}</h1>
  <div style="color:rgba(255,255,255,0.6);font-size:13px;margin-top:8px;">
    Readiness: ${stats.index}/100 (${stats.stage}) · ${stats.gapCount} gaps · ${stats.scopeItemCount} scope items
  </div>
</div>

${proposal.execSummary ? `<h2>Executive Summary</h2><p style="font-size:14px;">${proposal.execSummary.replace(/\n/g, '<br>')}</p>` : ''}

${(proposal.modules || []).map((mod: any) => {
  const wsGaps = gaps.filter(g => g.workstreamCode === mod.workstreamCode);
  return `
<div class="module">
  <div class="module-header">
    <span class="ws-badge">${mod.workstreamCode}</span>
    <div style="flex:1;">
      <div style="font-weight:600;font-size:15px;">${mod.workstreamName}</div>
      <div style="font-size:12px;color:#666;">${mod.objective || ''}</div>
    </div>
    ${mod.executionModel ? `<span class="exec-badge">${EXEC_LABELS[mod.executionModel] || mod.executionModel}</span>` : ''}
    <div style="font-size:14px;font-weight:700;color:#0A867F;">${mod.effort || 0} pts · ${mod.phase || 'P1'}</div>
  </div>
  ${mod.currentState ? `<p style="font-size:13px;"><strong style="color:#D97A2B;">Current State:</strong> ${mod.currentState}</p>` : ''}
  ${mod.recommendation ? `<p style="font-size:13px;"><strong style="color:#0A867F;">Recommendation:</strong> ${mod.recommendation}</p>` : ''}
  ${(mod.scopeItems || []).map((item: string) => `<div class="scope-item">${item}</div>`).join('')}
  ${mod.rationale ? `<p style="font-size:12px;color:#666;font-style:italic;margin-top:12px;"><strong>So What:</strong> ${mod.rationale}</p>` : ''}
</div>`;
}).join('')}

${proposal.investmentSummary ? `<h2>Investment Summary</h2><p style="font-size:14px;">${proposal.investmentSummary}</p>` : ''}

${(proposal.nextSteps || []).length > 0 ? `
<h2>Next Steps</h2>
<ol>${proposal.nextSteps.map((s: string) => `<li style="font-size:13px;margin:4px 0;">${s}</li>`).join('')}</ol>
` : ''}

<div class="footer">
  ${workshop.customerName} — Commercial Proposal · Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} · Galent SalesPilot
</div>
</body></html>`;
}
