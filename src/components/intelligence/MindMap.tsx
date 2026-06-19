'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { useSession } from 'next-auth/react';
import { Maximize2, Minimize2, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';

// ── Types ──
interface MindMapNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: 'user' | 'summary' | 'deal' | 'stakeholder' | 'task';
  value?: number;       // TCV for deals
  health?: number;      // 0-100 health score
  status?: string;      // deal stage
  count?: number;       // for summary nodes
  urgency?: number;     // 0-1: controls pulse speed
  parentId?: string;    // for connecting to deals
  raw?: any;            // full opportunity object
}

interface MindMapLink extends d3.SimulationLinkDatum<MindMapNode> {
  strength?: number;    // engagement frequency
  decaying?: boolean;   // no contact 14+ days
}

interface MindMapProps {
  opportunities: any[];
  onDealClick: (id: string) => void;
}

// ── Color helpers ──
function healthColor(score: number | undefined): string {
  if (!score || score < 40) return '#ef4444';  // red
  if (score < 70) return '#f59e0b';           // amber
  return '#22c55e';                            // green
}

function stageColor(stage: string): string {
  const colors: Record<string, string> = {
    Discovery: '#3b82f6', Qualification: '#f59e0b', Proposal: '#7c3aed',
    Negotiation: '#22c55e', Won: '#10b981', Lost: '#ef4444', 'On Hold': '#6b7280',
  };
  return colors[stage] || '#7c3aed';
}

function nodeRadius(node: MindMapNode): number {
  if (node.type === 'user') return 32;
  if (node.type === 'summary') return 26;
  if (node.type === 'deal') {
    const tcv = node.value || 0;
    return Math.max(12, Math.min(28, 10 + Math.sqrt(tcv / 10000)));
  }
  if (node.type === 'stakeholder') return 8;
  if (node.type === 'task') return 6;
  return 10;
}

export function MindMap({ opportunities, onDealClick }: MindMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<MindMapNode, MindMapLink> | null>(null);
  const { data: session } = useSession();
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string; sub?: string } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const userName = session?.user?.name || 'You';

  const buildGraph = useCallback(() => {
    const activeDeals = opportunities.filter(o => !['Won', 'Lost'].includes(o.status));
    const wonDeals = opportunities.filter(o => o.status === 'Won');
    const nodes: MindMapNode[] = [];
    const links: MindMapLink[] = [];

    // Center: User node
    nodes.push({ id: 'user', label: userName.split(' ')[0], type: 'user' });

    // Ring 1: Summary nodes
    const totalPipeline = activeDeals.reduce((s, o) => s + (o.tcv || 0), 0);
    const totalRevenue = wonDeals.reduce((s, o) => s + (o.tcv || 0), 0);
    const signalCount = opportunities.filter(o => {
      const age = (Date.now() - new Date(o.updatedAt || o.createdAt).getTime()) / 86400000;
      return age < 3;
    }).length;

    const summaries = [
      { id: 'sum-pipeline', label: `$${(totalPipeline / 1e6).toFixed(1)}M`, type: 'summary' as const, count: activeDeals.length, value: totalPipeline },
      { id: 'sum-revenue', label: `$${(totalRevenue / 1e6).toFixed(1)}M`, type: 'summary' as const, count: wonDeals.length, value: totalRevenue },
      { id: 'sum-deals', label: `${opportunities.length}`, type: 'summary' as const, count: opportunities.length },
      { id: 'sum-signals', label: `${signalCount}`, type: 'summary' as const, count: signalCount },
    ];
    summaries.forEach(s => {
      nodes.push(s);
      links.push({ source: 'user', target: s.id, strength: 1 });
    });

    // Ring 2: Deal nodes
    activeDeals.forEach(opp => {
      const ageDays = (Date.now() - new Date(opp.updatedAt || opp.createdAt).getTime()) / 86400000;
      const overdueTasks = (opp.subTasks || []).filter((t: any) => t.status === 'pending' && new Date(t.dueDate) < new Date()).length;
      const urgency = Math.min(1, (ageDays > 14 ? 0.6 : 0) + (overdueTasks > 0 ? 0.3 : 0) + (!opp.tcv ? 0.1 : 0));

      nodes.push({
        id: opp.id,
        label: opp.customerName,
        type: 'deal',
        value: opp.tcv || 0,
        health: opp.dealHealthScore || (urgency > 0.5 ? 30 : urgency > 0.2 ? 60 : 80),
        status: opp.status,
        urgency,
        raw: opp,
      });

      // Connect deal to its stage summary
      links.push({ source: 'sum-pipeline', target: opp.id, strength: 0.3, decaying: ageDays > 14 });

      // Ring 3: Stakeholders for this deal (limited to DMs and primary contacts)
      const stakeholders = (opp.customerStakeholders || []).filter((s: any) => s.isDecisionMaker || s.isPrimaryContact);
      stakeholders.slice(0, 2).forEach((sh: any) => {
        const shId = `sh-${opp.id}-${sh.id}`;
        if (!nodes.find(n => n.id === shId)) {
          nodes.push({ id: shId, label: sh.name, type: 'stakeholder', parentId: opp.id });
          links.push({ source: opp.id, target: shId, strength: sh.isDecisionMaker ? 0.8 : 0.4 });
        }
      });
    });

    return { nodes, links };
  }, [opportunities, userName]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || opportunities.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const svg = d3.select(svgRef.current);

    svg.selectAll('*').remove();

    const { nodes, links } = buildGraph();

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    const g = svg.append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    // Initial zoom to center
    svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(0.85));

    // ── Defs: gradients and filters ──
    const defs = svg.append('defs');

    // Glow filter
    const glow = defs.append('filter').attr('id', 'glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
    glow.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'blur');
    glow.append('feMerge').selectAll('feMergeNode')
      .data(['blur', 'SourceGraphic']).enter()
      .append('feMergeNode').attr('in', d => d);

    // Pulse glow filter
    const pulseGlow = defs.append('filter').attr('id', 'pulse-glow').attr('x', '-80%').attr('y', '-80%').attr('width', '260%').attr('height', '260%');
    pulseGlow.append('feGaussianBlur').attr('stdDeviation', '6').attr('result', 'blur');
    pulseGlow.append('feMerge').selectAll('feMergeNode')
      .data(['blur', 'SourceGraphic']).enter()
      .append('feMergeNode').attr('in', d => d);

    // ── Force simulation ──
    const simulation = d3.forceSimulation<MindMapNode>(nodes)
      .force('link', d3.forceLink<MindMapNode, MindMapLink>(links).id(d => d.id).distance(d => {
        const src = d.source as MindMapNode;
        const tgt = d.target as MindMapNode;
        if (src.type === 'user' && tgt.type === 'summary') return 80;
        if (src.type === 'summary' && tgt.type === 'deal') return 120;
        if (tgt.type === 'stakeholder') return 50;
        return 80;
      }).strength(d => (d as MindMapLink).strength || 0.3))
      .force('charge', d3.forceManyBody().strength(d => {
        const node = d as MindMapNode;
        if (node.type === 'user') return -300;
        if (node.type === 'summary') return -200;
        if (node.type === 'deal') return -100;
        return -30;
      }))
      .force('center', d3.forceCenter(0, 0).strength(0.05))
      .force('collision', d3.forceCollide<MindMapNode>().radius(d => nodeRadius(d) + 4))
      .force('radial', d3.forceRadial<MindMapNode>(d => {
        if (d.type === 'user') return 0;
        if (d.type === 'summary') return 90;
        if (d.type === 'deal') return 190;
        return 260;
      }, 0, 0).strength(0.4))
      .alphaDecay(0.015)
      .velocityDecay(0.3);

    simulationRef.current = simulation;

    // ── Links ──
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('stroke', d => d.decaying ? 'rgba(239,68,68,0.15)' : 'rgba(124,58,237,0.12)')
      .attr('stroke-width', d => Math.max(0.5, (d.strength || 0.3) * 3))
      .attr('stroke-dasharray', d => d.decaying ? '4 4' : 'none');

    // ── Animated link pulses ──
    const pulseLinks = links.filter(l => !l.decaying && (l.strength || 0) > 0.5);
    const pulseCircles = g.append('g')
      .selectAll('circle')
      .data(pulseLinks)
      .enter().append('circle')
      .attr('r', 2)
      .attr('fill', '#7c3aed')
      .attr('opacity', 0.6);

    // ── Node groups ──
    const nodeGroup = g.append('g')
      .selectAll<SVGGElement, MindMapNode>('g')
      .data(nodes)
      .enter().append('g')
      .attr('cursor', d => d.type === 'deal' ? 'pointer' : 'default')
      .call(d3.drag<SVGGElement, MindMapNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    // ── Halos for at-risk / ready-to-close ──
    nodeGroup.filter(d => d.type === 'deal' && ((d.health || 80) < 40 || d.status === 'Negotiation'))
      .append('circle')
      .attr('r', d => nodeRadius(d) + 6)
      .attr('fill', 'none')
      .attr('stroke', d => d.status === 'Negotiation' ? '#22c55e' : '#ef4444')
      .attr('stroke-width', 2)
      .attr('opacity', 0)
      .each(function (d) {
        const el = d3.select(this);
        function halo() {
          el.transition()
            .duration(1200 + (1 - (d.urgency || 0)) * 1500)
            .attr('opacity', 0.6)
            .attr('r', nodeRadius(d) + 10)
            .transition()
            .duration(1200)
            .attr('opacity', 0)
            .attr('r', nodeRadius(d) + 6)
            .on('end', halo);
        }
        halo();
      });

    // ── Node circles ──
    nodeGroup.append('circle')
      .attr('r', d => nodeRadius(d))
      .attr('fill', d => {
        if (d.type === 'user') return '#7c3aed';
        if (d.type === 'summary') return 'rgba(124,58,237,0.15)';
        if (d.type === 'deal') return `${healthColor(d.health)}15`;
        if (d.type === 'stakeholder') return 'rgba(17,167,160,0.2)';
        return 'rgba(107,114,128,0.15)';
      })
      .attr('stroke', d => {
        if (d.type === 'user') return '#7c3aed';
        if (d.type === 'summary') return '#7c3aed';
        if (d.type === 'deal') return healthColor(d.health);
        if (d.type === 'stakeholder') return '#11A7A0';
        return '#6b7280';
      })
      .attr('stroke-width', d => d.type === 'user' ? 3 : d.type === 'deal' ? 2 : 1)
      .attr('filter', d => (d.type === 'user' || d.type === 'summary') ? 'url(#glow)' : 'none');

    // ── Breathing animation for nodes ──
    nodeGroup.filter(d => d.type === 'deal')
      .select('circle')
      .each(function (d) {
        const el = d3.select(this);
        const r = nodeRadius(d);
        function breathe() {
          el.transition()
            .duration(3000 + Math.random() * 2000)
            .ease(d3.easeSinInOut)
            .attr('r', r + 1.5)
            .transition()
            .duration(3000 + Math.random() * 2000)
            .ease(d3.easeSinInOut)
            .attr('r', r)
            .on('end', breathe);
        }
        breathe();
      });

    // ── Labels ──
    nodeGroup.append('text')
      .text(d => {
        if (d.type === 'user') return d.label;
        if (d.type === 'summary') return d.label;
        if (d.type === 'deal') return d.label.length > 12 ? d.label.slice(0, 11) + '…' : d.label;
        if (d.type === 'stakeholder') return d.label.split(' ')[0];
        return '';
      })
      .attr('text-anchor', 'middle')
      .attr('dy', d => {
        if (d.type === 'user') return '0.35em';
        if (d.type === 'summary') return '-0.3em';
        return nodeRadius(d) + 14;
      })
      .attr('font-size', d => {
        if (d.type === 'user') return '11px';
        if (d.type === 'summary') return '11px';
        if (d.type === 'deal') return '9px';
        return '7px';
      })
      .attr('font-weight', d => (d.type === 'user' || d.type === 'summary') ? '700' : '500')
      .attr('fill', d => {
        if (d.type === 'user') return '#ffffff';
        if (d.type === 'summary') return '#7c3aed';
        return 'var(--g-fg, #e5e7eb)';
      })
      .attr('pointer-events', 'none');

    // Summary sub-labels
    nodeGroup.filter(d => d.type === 'summary')
      .append('text')
      .text(d => {
        if (d.id === 'sum-pipeline') return 'Pipeline';
        if (d.id === 'sum-revenue') return 'Revenue';
        if (d.id === 'sum-deals') return 'Deals';
        if (d.id === 'sum-signals') return 'Signals';
        return '';
      })
      .attr('text-anchor', 'middle')
      .attr('dy', '1em')
      .attr('font-size', '8px')
      .attr('fill', 'var(--g-muted, #9ca3af)')
      .attr('pointer-events', 'none');

    // Deal TCV labels inside node
    nodeGroup.filter(d => d.type === 'deal' && (d.value || 0) > 0)
      .append('text')
      .text(d => `$${((d.value || 0) / 1000).toFixed(0)}k`)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', '7px')
      .attr('font-weight', '600')
      .attr('fill', d => healthColor(d.health))
      .attr('pointer-events', 'none');

    // ── Stage badge for deals ──
    nodeGroup.filter(d => d.type === 'deal')
      .append('rect')
      .attr('x', d => -nodeRadius(d))
      .attr('y', d => -nodeRadius(d) - 12)
      .attr('width', d => nodeRadius(d) * 2)
      .attr('height', 10)
      .attr('rx', 3)
      .attr('fill', d => `${stageColor(d.status || '')}30`)
      .attr('stroke', 'none');

    nodeGroup.filter(d => d.type === 'deal')
      .append('text')
      .text(d => d.status || '')
      .attr('text-anchor', 'middle')
      .attr('y', d => -nodeRadius(d) - 4)
      .attr('font-size', '6px')
      .attr('font-weight', '600')
      .attr('fill', d => stageColor(d.status || ''))
      .attr('pointer-events', 'none');

    // ── Interactions ──
    nodeGroup
      .on('click', (_, d) => {
        if (d.type === 'deal' && d.id) {
          onDealClick(d.id);
        }
      })
      .on('mouseenter', (event, d) => {
        setHoveredNode(d.id);
        const rect = container.getBoundingClientRect();
        let content = d.label;
        let sub = '';
        if (d.type === 'deal') {
          content = `${d.raw?.customerName}: ${d.raw?.opportunityName}`;
          sub = `$${((d.value || 0) / 1000).toFixed(0)}k · ${d.status} · Health: ${d.health || 'N/A'}`;
        } else if (d.type === 'summary') {
          if (d.id === 'sum-pipeline') sub = `${d.count} active deals`;
          if (d.id === 'sum-revenue') sub = `${d.count} won deals`;
          if (d.id === 'sum-deals') sub = `Total opportunities`;
          if (d.id === 'sum-signals') sub = `Recent signals (3 days)`;
        } else if (d.type === 'stakeholder') {
          sub = 'Click deal to view';
        }
        setTooltip({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top - 10,
          content,
          sub,
        });
      })
      .on('mouseleave', () => {
        setHoveredNode(null);
        setTooltip(null);
      });

    // ── Tick ──
    let tickCount = 0;
    simulation.on('tick', () => {
      tickCount++;

      link
        .attr('x1', d => (d.source as MindMapNode).x || 0)
        .attr('y1', d => (d.source as MindMapNode).y || 0)
        .attr('x2', d => (d.target as MindMapNode).x || 0)
        .attr('y2', d => (d.target as MindMapNode).y || 0);

      nodeGroup.attr('transform', d => `translate(${d.x || 0},${d.y || 0})`);

      // Animate pulse circles along their link paths
      pulseCircles.each(function (d) {
        const s = d.source as MindMapNode;
        const t = d.target as MindMapNode;
        const progress = (Math.sin(tickCount * 0.02 + (s.index || 0)) + 1) / 2;
        d3.select(this)
          .attr('cx', (s.x || 0) + ((t.x || 0) - (s.x || 0)) * progress)
          .attr('cy', (s.y || 0) + ((t.y || 0) - (s.y || 0)) * progress);
      });
    });

    return () => {
      simulation.stop();
    };
  }, [opportunities, buildGraph, onDealClick]);

  const handleZoom = (direction: 'in' | 'out') => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const zoom = d3.zoom<SVGSVGElement, unknown>();
    svg.transition().duration(300).call(
      zoom.scaleBy as any,
      direction === 'in' ? 1.3 : 0.7
    );
  };

  const handleReset = () => {
    simulationRef.current?.alpha(0.8).restart();
  };

  return (
    <div
      ref={containerRef}
      className={`relative rounded-xl g-surface g-elevated overflow-hidden transition-all duration-500 ${
        expanded ? 'fixed inset-4 z-[80]' : 'h-[420px]'
      }`}
      style={{ background: 'radial-gradient(ellipse at center, rgba(124,58,237,0.03) 0%, transparent 70%)' }}
    >
      {/* Header overlay */}
      <div className="absolute top-3 left-4 z-10 flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-[#7c3aed]/20 flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-[#7c3aed]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        </div>
        <span className="text-xs font-semibold text-[#7c3aed] uppercase tracking-wider">Intelligence Mindmap</span>
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-1" />
      </div>

      {/* Controls */}
      <div className="absolute top-3 right-4 z-10 flex items-center gap-1">
        <button onClick={() => handleZoom('in')} className="p-1.5 rounded-lg bg-card/80 border border-border/50 text-muted-foreground hover:text-foreground transition-colors backdrop-blur-sm" title="Zoom in">
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => handleZoom('out')} className="p-1.5 rounded-lg bg-card/80 border border-border/50 text-muted-foreground hover:text-foreground transition-colors backdrop-blur-sm" title="Zoom out">
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <button onClick={handleReset} className="p-1.5 rounded-lg bg-card/80 border border-border/50 text-muted-foreground hover:text-foreground transition-colors backdrop-blur-sm" title="Reset layout">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg bg-card/80 border border-border/50 text-muted-foreground hover:text-foreground transition-colors backdrop-blur-sm" title={expanded ? 'Minimize' : 'Expand'}>
          {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-4 z-10 flex items-center gap-3 text-[9px] text-muted-foreground bg-card/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-border/30">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#22c55e]" /> Healthy</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f59e0b]" /> At Risk</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#ef4444]" /> Critical</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#11A7A0]" /> Stakeholder</span>
        <span className="text-[8px] opacity-60">Scroll to zoom · Drag nodes</span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-20 px-3 py-2 rounded-lg bg-card border border-border shadow-xl pointer-events-none transition-all duration-150"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
        >
          <div className="text-xs font-medium text-foreground whitespace-nowrap">{tooltip.content}</div>
          {tooltip.sub && <div className="text-[10px] text-muted-foreground mt-0.5">{tooltip.sub}</div>}
        </div>
      )}

      {/* SVG Canvas */}
      <svg ref={svgRef} width="100%" height="100%" className="cursor-grab active:cursor-grabbing" />

      {/* Empty state */}
      {opportunities.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          No opportunities to visualize
        </div>
      )}

      {/* Expanded backdrop */}
      {expanded && (
        <div className="fixed inset-0 bg-black/40 -z-10" onClick={() => setExpanded(false)} />
      )}
    </div>
  );
}
