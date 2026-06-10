'use client';

import { useState, useRef, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Sparkles, Users, Briefcase, Building2, ZoomIn, ZoomOut } from 'lucide-react';

interface RelationshipMapProps {
  accountNodeId: string;
  accountName: string;
}

interface GraphNode {
  id: string;
  type: string;
  label: string;
  properties: Record<string, any>;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface GraphEdge {
  from: string;
  to: string;
  relationship: string;
  weight: number;
}

export function RelationshipMap({ accountNodeId, accountName }: RelationshipMapProps) {
  const { data, isLoading } = trpc.graph.getRelationshipMap.useQuery({ accountNodeId });
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [zoom, setZoom] = useState(1);

  // Initialize node positions in a circular layout
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);

  useEffect(() => {
    if (!data || !data.nodes) return;

    const centerX = 400;
    const centerY = 300;
    const radius = 200;

    const initialNodes: GraphNode[] = data.nodes.map((n: any, i: number) => {
      const angle = (2 * Math.PI * i) / data.nodes.length;
      // Place accounts at center, people in ring, opportunities between
      let r = radius;
      if (n.type === 'account') r = 0;
      else if (n.type === 'opportunity') r = radius * 0.5;

      return {
        ...n,
        x: centerX + r * Math.cos(angle) + (Math.random() - 0.5) * 30,
        y: centerY + r * Math.sin(angle) + (Math.random() - 0.5) * 30,
        vx: 0, vy: 0,
      };
    });

    setNodes(initialNodes);
    setEdges(data.edges || []);
  }, [data]);

  // Simple force simulation (runs a few iterations)
  useEffect(() => {
    if (nodes.length === 0) return;

    let animationFrame: number;
    let iterations = 0;
    const maxIterations = 100;

    const simulate = () => {
      if (iterations >= maxIterations) return;

      setNodes(prev => {
        const next = prev.map(n => ({ ...n }));

        // Repulsion between all nodes
        for (let i = 0; i < next.length; i++) {
          for (let j = i + 1; j < next.length; j++) {
            const dx = next[j].x - next[i].x;
            const dy = next[j].y - next[i].y;
            const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
            const force = 5000 / (dist * dist);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            next[i].vx -= fx; next[i].vy -= fy;
            next[j].vx += fx; next[j].vy += fy;
          }
        }

        // Attraction along edges
        edges.forEach(edge => {
          const source = next.find(n => n.id === edge.from);
          const target = next.find(n => n.id === edge.to);
          if (!source || !target) return;
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const force = (dist - 150) * 0.01;
          const fx = (dx / Math.max(dist, 1)) * force;
          const fy = (dy / Math.max(dist, 1)) * force;
          source.vx += fx; source.vy += fy;
          target.vx -= fx; target.vy -= fy;
        });

        // Center gravity
        next.forEach(n => {
          n.vx += (400 - n.x) * 0.001;
          n.vy += (300 - n.y) * 0.001;
          n.vx *= 0.8; n.vy *= 0.8;
          n.x += n.vx; n.y += n.vy;
          n.x = Math.max(50, Math.min(750, n.x));
          n.y = Math.max(50, Math.min(550, n.y));
        });

        return next;
      });

      iterations++;
      animationFrame = requestAnimationFrame(simulate);
    };

    simulate();
    return () => cancelAnimationFrame(animationFrame);
  }, [nodes.length, edges]);

  const nodeColors: Record<string, { fill: string; stroke: string; icon: typeof Building2 }> = {
    account: { fill: '#5B4FE920', stroke: '#5B4FE9', icon: Building2 },
    person: { fill: '#22c55e20', stroke: '#22c55e', icon: Users },
    opportunity: { fill: '#3b82f620', stroke: '#3b82f6', icon: Briefcase },
    user: { fill: '#f59e0b20', stroke: '#f59e0b', icon: Users },
    service_line: { fill: '#ec489920', stroke: '#ec4899', icon: Sparkles },
  };

  const relationshipColors: Record<string, string> = {
    HAS_STAKEHOLDER: '#22c55e',
    DECIDES: '#f59e0b',
    CHAMPIONS: '#5B4FE9',
    EVALUATES: '#3b82f6',
    OWNS_OPPORTUNITY: '#f97316',
    BELONGS_TO_ACCOUNT: '#6366f1',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Sparkles className="h-5 w-5 animate-spin text-[#5B4FE9] mr-2" />
        Loading relationship map...
      </div>
    );
  }

  if (!data || nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        No relationship data available for this account.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="g-section-label">Relationship Map — {accountName}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(z => Math.min(z + 0.2, 2))} className="p-1 rounded hover:bg-secondary text-muted-foreground"><ZoomIn className="h-3.5 w-3.5" /></button>
          <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.5))} className="p-1 rounded hover:bg-secondary text-muted-foreground"><ZoomOut className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      <div className="g-surface g-elevated rounded-xl overflow-hidden" style={{ height: '400px' }}>
        <svg ref={svgRef} width="100%" height="100%" viewBox={`0 0 ${800/zoom} ${600/zoom}`} className="cursor-move">
          {/* Edges */}
          {edges.map((edge, i) => {
            const source = nodes.find(n => n.id === edge.from);
            const target = nodes.find(n => n.id === edge.to);
            if (!source || !target) return null;
            const color = relationshipColors[edge.relationship] || 'var(--g-line)';
            return (
              <g key={`edge-${i}`}>
                <line x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke={color} strokeWidth={1.5} strokeOpacity={0.4} />
                <text x={(source.x + target.x) / 2} y={(source.y + target.y) / 2 - 5} fontSize="8" fill="var(--g-fg-3)" textAnchor="middle">
                  {edge.relationship.replace(/_/g, ' ').toLowerCase()}
                </text>
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map(node => {
            const config = nodeColors[node.type] || nodeColors.person;
            const isSelected = selectedNode?.id === node.id;
            const r = node.type === 'account' ? 30 : 20;

            return (
              <g key={node.id} className="cursor-pointer" onClick={() => setSelectedNode(isSelected ? null : node)}>
                <circle cx={node.x} cy={node.y} r={r + 4} fill="transparent" stroke={isSelected ? config.stroke : 'transparent'} strokeWidth={2} strokeDasharray="4 2" />
                <circle cx={node.x} cy={node.y} r={r} fill={config.fill} stroke={config.stroke} strokeWidth={1.5} />
                <text x={node.x} y={node.y + 3} fontSize={node.type === 'account' ? '11' : '9'} fill="var(--g-fg)" textAnchor="middle" fontWeight={node.type === 'account' ? '600' : '400'}>
                  {node.label.length > 15 ? node.label.slice(0, 15) + '\u2026' : node.label}
                </text>
                <text x={node.x} y={node.y + r + 12} fontSize="7" fill="var(--g-fg-3)" textAnchor="middle">
                  {node.type}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
        {Object.entries(nodeColors).slice(0, 4).map(([type, config]) => (
          <div key={type} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: config.stroke + '30', border: `1.5px solid ${config.stroke}` }} />
            <span className="capitalize">{type.replace('_', ' ')}</span>
          </div>
        ))}
      </div>

      {/* Selected node detail */}
      {selectedNode && (
        <div className="p-3 rounded-lg bg-card border border-border text-sm">
          <div className="font-medium text-foreground">{selectedNode.label}</div>
          <div className="text-xs text-muted-foreground capitalize">{selectedNode.type.replace('_', ' ')}</div>
          {selectedNode.properties && Object.entries(selectedNode.properties).slice(0, 5).map(([key, val]) => (
            val && <div key={key} className="text-[11px] text-muted-foreground mt-0.5">{key}: {String(val)}</div>
          ))}
        </div>
      )}
    </div>
  );
}
