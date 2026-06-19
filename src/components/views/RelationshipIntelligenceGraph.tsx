'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { trpc } from '@/lib/trpc/client';
import { Sparkles, Users, Briefcase, Building2, ZoomIn, ZoomOut, Maximize2, Minimize2 } from 'lucide-react';

interface RIGProps {
  accountName: string;
  opportunities: any[];
}

interface GNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: 'account' | 'deal' | 'person';
  sentiment?: string;
  engagement?: number;
  isDecisionMaker?: boolean;
  tcv?: number;
  status?: string;
}

interface GLink extends d3.SimulationLinkDatum<GNode> {
  relationship: string;
  weight: number;
}

const TYPE_COLORS: Record<string, { fill: string; stroke: string }> = {
  account: { fill: '#7c3aed20', stroke: '#7c3aed' },
  deal: { fill: '#3b82f620', stroke: '#3b82f6' },
  person: { fill: '#22c55e20', stroke: '#22c55e' },
};

const SENTIMENT_COLORS: Record<string, string> = {
  champion: '#22c55e',
  supporter: '#3b82f6',
  neutral: '#6b7280',
  blocker: '#ef4444',
};

export default function RelationshipIntelligenceGraph({ accountName, opportunities }: RIGProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string; sub: string } | null>(null);

  const accountOpps = useMemo(() =>
    opportunities.filter(o => o.customerName === accountName),
    [opportunities, accountName]
  );

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || accountOpps.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Build graph from opportunities
    const nodes: GNode[] = [];
    const links: GLink[] = [];

    // Account center
    nodes.push({ id: `acct-${accountName}`, label: accountName, type: 'account' });

    // Deals
    accountOpps.forEach(opp => {
      nodes.push({
        id: `deal-${opp.id}`,
        label: opp.opportunityName?.length > 20 ? opp.opportunityName.slice(0, 18) + '...' : opp.opportunityName,
        type: 'deal',
        tcv: opp.tcv,
        status: opp.status,
      });
      links.push({ source: `acct-${accountName}`, target: `deal-${opp.id}`, relationship: 'HAS_DEAL', weight: 1 });

      // Stakeholders
      (opp.customerStakeholders || []).forEach((sh: any) => {
        const personId = `person-${sh.name.replace(/\s+/g, '-').toLowerCase()}`;
        if (!nodes.find(n => n.id === personId)) {
          nodes.push({
            id: personId,
            label: sh.name,
            type: 'person',
            isDecisionMaker: sh.isDecisionMaker,
            sentiment: sh.isDecisionMaker ? 'champion' : sh.isPrimaryContact ? 'supporter' : 'neutral',
            engagement: sh.isDecisionMaker ? 0.9 : sh.isPrimaryContact ? 0.6 : 0.3,
          });
        }
        links.push({
          source: `deal-${opp.id}`,
          target: personId,
          relationship: sh.isDecisionMaker ? 'DECIDES' : 'STAKEHOLDER',
          weight: sh.isDecisionMaker ? 1.5 : 0.8,
        });
      });
    });

    if (nodes.length <= 1) return;

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom);

    const g = svg.append('g');
    svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(0.9));

    // Glow filter
    const defs = svg.append('defs');
    const glow = defs.append('filter').attr('id', 'rig-glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
    glow.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'blur');
    glow.append('feMerge').selectAll('feMergeNode').data(['blur', 'SourceGraphic']).enter().append('feMergeNode').attr('in', d => d);

    // Simulation
    const sim = d3.forceSimulation<GNode>(nodes)
      .force('link', d3.forceLink<GNode, GLink>(links).id(d => d.id).distance(d => d.relationship === 'HAS_DEAL' ? 80 : 60).strength(d => d.weight * 0.3))
      .force('charge', d3.forceManyBody().strength(d => (d as GNode).type === 'account' ? -300 : (d as GNode).type === 'deal' ? -150 : -60))
      .force('center', d3.forceCenter(0, 0).strength(0.05))
      .force('collision', d3.forceCollide<GNode>().radius(d => d.type === 'account' ? 35 : d.type === 'deal' ? 22 : 14))
      .force('radial', d3.forceRadial<GNode>(d => d.type === 'account' ? 0 : d.type === 'deal' ? 100 : 170, 0, 0).strength(0.3))
      .alphaDecay(0.02);

    // Links
    const link = g.append('g').selectAll('line').data(links).enter().append('line')
      .attr('stroke', d => d.relationship === 'DECIDES' ? '#f59e0b' : 'rgba(124,58,237,0.15)')
      .attr('stroke-width', d => d.weight * 1.5)
      .attr('stroke-dasharray', d => d.relationship === 'STAKEHOLDER' ? '4 3' : 'none');

    // Link labels
    const linkLabel = g.append('g').selectAll('text').data(links).enter().append('text')
      .text(d => d.relationship.replace(/_/g, ' ').toLowerCase())
      .attr('text-anchor', 'middle')
      .attr('font-size', '6px')
      .attr('fill', 'var(--g-fg-3, #9ca3af)')
      .attr('pointer-events', 'none');

    // Node groups
    const nodeGroup = g.append('g').selectAll<SVGGElement, GNode>('g').data(nodes).enter().append('g')
      .attr('cursor', 'pointer')
      .call(d3.drag<SVGGElement, GNode>()
        .on('start', (event, d) => { if (!event.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
        .on('end', (event, d) => { if (!event.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
      );

    // Sentiment halos for people
    nodeGroup.filter(d => d.type === 'person' && !!d.sentiment)
      .append('circle')
      .attr('r', 18)
      .attr('fill', 'none')
      .attr('stroke', d => SENTIMENT_COLORS[d.sentiment || 'neutral'])
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', d => d.sentiment === 'blocker' ? '3 2' : 'none')
      .attr('opacity', 0.4);

    // DM crown
    nodeGroup.filter(d => !!d.isDecisionMaker)
      .append('text')
      .text('★')
      .attr('text-anchor', 'middle')
      .attr('y', -16)
      .attr('font-size', '10px')
      .attr('fill', '#f59e0b');

    // Node circles
    nodeGroup.append('circle')
      .attr('r', d => d.type === 'account' ? 28 : d.type === 'deal' ? 18 : 12)
      .attr('fill', d => TYPE_COLORS[d.type].fill)
      .attr('stroke', d => d.type === 'person' ? SENTIMENT_COLORS[d.sentiment || 'neutral'] : TYPE_COLORS[d.type].stroke)
      .attr('stroke-width', d => d.type === 'account' ? 2.5 : 1.5)
      .attr('filter', d => d.type === 'account' ? 'url(#rig-glow)' : 'none');

    // Engagement ring for people (thicker = more engaged)
    nodeGroup.filter(d => d.type === 'person' && (d.engagement || 0) > 0)
      .append('circle')
      .attr('r', d => 12 + (d.engagement || 0) * 4)
      .attr('fill', 'none')
      .attr('stroke', d => SENTIMENT_COLORS[d.sentiment || 'neutral'])
      .attr('stroke-width', d => (d.engagement || 0) * 3)
      .attr('opacity', 0.15);

    // Labels
    nodeGroup.append('text')
      .text(d => d.label.length > 14 ? d.label.slice(0, 13) + '…' : d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.type === 'account' ? '0.35em' : (d.type === 'deal' ? 28 : 22))
      .attr('font-size', d => d.type === 'account' ? '10px' : '8px')
      .attr('font-weight', d => d.type === 'account' ? '700' : '500')
      .attr('fill', d => d.type === 'account' ? '#7c3aed' : 'var(--g-fg, #e5e7eb)')
      .attr('pointer-events', 'none');

    // TCV label for deals
    nodeGroup.filter(d => d.type === 'deal' && (d.tcv || 0) > 0)
      .append('text')
      .text(d => `$${((d.tcv || 0) / 1000).toFixed(0)}k`)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', '7px')
      .attr('font-weight', '600')
      .attr('fill', d => d.status === 'Won' ? '#22c55e' : '#3b82f6')
      .attr('pointer-events', 'none');

    // Tooltips
    nodeGroup
      .on('mouseenter', (event, d) => {
        const rect = container.getBoundingClientRect();
        let text = d.label;
        let sub: string = d.type;
        if (d.type === 'deal') sub = `${d.status} · $${((d.tcv || 0) / 1000).toFixed(0)}k`;
        if (d.type === 'person') sub = `${d.sentiment || 'neutral'}${d.isDecisionMaker ? ' · Decision Maker' : ''} · Engagement: ${Math.round((d.engagement || 0) * 100)}%`;
        setTooltip({ x: event.clientX - rect.left, y: event.clientY - rect.top - 10, text, sub });
      })
      .on('mouseleave', () => setTooltip(null));

    // Tick
    sim.on('tick', () => {
      link
        .attr('x1', d => (d.source as GNode).x || 0).attr('y1', d => (d.source as GNode).y || 0)
        .attr('x2', d => (d.target as GNode).x || 0).attr('y2', d => (d.target as GNode).y || 0);
      linkLabel
        .attr('x', d => ((d.source as GNode).x! + (d.target as GNode).x!) / 2)
        .attr('y', d => ((d.source as GNode).y! + (d.target as GNode).y!) / 2 - 4);
      nodeGroup.attr('transform', d => `translate(${d.x || 0},${d.y || 0})`);
    });

    return () => { sim.stop(); };
  }, [accountOpps, accountName]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={containerRef} className={`relative rounded-xl g-surface g-elevated overflow-hidden ${expanded ? 'fixed inset-4 z-[80]' : 'h-[350px]'}`}
      style={{ background: 'radial-gradient(ellipse at center, rgba(124,58,237,0.02) 0%, transparent 70%)' }}>
      <div className="absolute top-3 left-4 z-10 flex items-center gap-2">
        <span className="text-[10px] font-semibold text-[#7c3aed] uppercase tracking-wider">Relationship Intelligence — {accountName}</span>
      </div>
      <div className="absolute top-3 right-4 z-10 flex items-center gap-1">
        <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg bg-card/80 border border-border/50 text-muted-foreground hover:text-foreground backdrop-blur-sm">
          {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>
      </div>
      {/* Legend */}
      <div className="absolute bottom-3 left-4 z-10 flex items-center gap-3 text-[8px] text-muted-foreground bg-card/60 backdrop-blur-sm px-2 py-1 rounded-lg border border-border/30">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#7c3aed]" /> Account</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#3b82f6]" /> Deal</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#22c55e]" /> Champion</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#6b7280]" /> Neutral</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#ef4444]" /> Blocker</span>
        <span>★ DM</span>
      </div>
      {tooltip && (
        <div className="absolute z-20 px-3 py-2 rounded-lg bg-card border border-border shadow-xl pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}>
          <div className="text-xs font-medium text-foreground">{tooltip.text}</div>
          <div className="text-[10px] text-muted-foreground">{tooltip.sub}</div>
        </div>
      )}
      <svg ref={svgRef} width="100%" height="100%" className="cursor-grab active:cursor-grabbing" />
      {accountOpps.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
          No deals for this account
        </div>
      )}
      {expanded && <div className="fixed inset-0 bg-black/40 -z-10" onClick={() => setExpanded(false)} />}
    </div>
  );
}
