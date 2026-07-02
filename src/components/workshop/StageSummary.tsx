'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  ChevronDown, ChevronUp, Sparkles, Loader2, FileText,
  StickyNote, Mic, Image, Layers, ArrowRight,
} from 'lucide-react';

interface StageSummaryProps {
  workshop: any;
  currentStage: string;
}

/**
 * StageSummary — shows a convergence bar at the top of each workshop tab.
 * Summarizes what was gathered in previous stages with source references.
 * Acts as a living document that grows as you progress through the wizard.
 */
export default function StageSummary({ workshop, currentStage }: StageSummaryProps) {
  const [expanded, setExpanded] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const chatMutation = trpc.ai.chat.useMutation();

  const levels = workshop.framework?.levels || [];
  const allDims = levels.flatMap((l: any) => l.dimensions || []);
  const scored = allDims.filter((d: any) => d.currentScore != null);
  const wb = workshop.whiteboard;
  const useCases = workshop.useCases || [];
  const scopeItems = workshop.scopeItems || [];

  // Compute what exists from each prior stage
  const intakeData = (workshop as any).intake;
  const hasIntake = !!intakeData;

  // Parse whiteboard state
  let wbStickies = 0, wbNotes = 0, wbMedia = 0, wbSections = 0;
  if (wb?.notes?.[0]?.text) {
    try {
      const parsed = JSON.parse(wb.notes[0].text);
      wbStickies = parsed.stickies?.length || 0;
      wbNotes = (parsed.sections || []).reduce((s: number, sec: any) => s + (sec.children?.length || 0), 0);
      wbMedia = parsed.mediaItems?.length || 0;
      wbSections = parsed.sections?.length || 0;
    } catch {}
  }
  const hasWhiteboard = wbStickies + wbNotes + wbMedia > 0;
  const hasAssessment = scored.length > 0;
  const hasUseCases = useCases.length > 0;
  const hasScope = scopeItems.length > 0;

  // What stages are complete
  const stages = [
    { id: 'intake', label: 'Intake', done: hasIntake, icon: FileText, stats: hasIntake ? 'Context gathered' : '' },
    { id: 'whiteboard', label: 'Whiteboard', done: hasWhiteboard, icon: StickyNote, stats: hasWhiteboard ? `${wbStickies} stickies · ${wbNotes} notes · ${wbMedia} files` : '' },
    { id: 'assess', label: 'Assess', done: hasAssessment, icon: Layers, stats: hasAssessment ? `${scored.length}/${allDims.length} scored` : '' },
    { id: 'usecases', label: 'Use Cases', done: hasUseCases, icon: Layers, stats: hasUseCases ? `${useCases.length} cases · ${useCases.filter((u: any) => u.isPilot).length} pilots` : '' },
    { id: 'scope', label: 'Scope', done: hasScope, icon: Layers, stats: hasScope ? `${scopeItems.length} items` : '' },
  ];

  const currentIdx = stages.findIndex(s => s.id === currentStage);
  const priorStages = stages.slice(0, currentIdx).filter(s => s.done);
  const totalInputs = (hasIntake ? 1 : 0) + wbStickies + wbNotes + wbMedia + scored.length + useCases.length + scopeItems.length;

  if (priorStages.length === 0 && !summary) return null;

  const handleGenerateSummary = async () => {
    setGenerating(true);
    try {
      let context = `Workshop: ${workshop.customerName} — ${workshop.title}\nCurrent stage: ${currentStage}\n\n`;
      if (hasIntake) context += `INTAKE: Business context gathered.\n`;
      if (hasWhiteboard) context += `WHITEBOARD: ${wbStickies} stickies, ${wbNotes} notes, ${wbMedia} files across ${wbSections} sections.\n`;
      if (hasAssessment) {
        context += `ASSESSMENT: ${scored.length}/${allDims.length} dimensions scored.\n`;
        const gaps = allDims.filter((d: any) => d.currentScore != null && d.targetScore != null && d.targetScore > d.currentScore);
        context += `Gaps: ${gaps.length}. Top gaps: ${gaps.sort((a: any, b: any) => (b.targetScore - b.currentScore) - (a.targetScore - a.currentScore)).slice(0, 5).map((d: any) => d.name).join(', ')}\n`;
      }
      if (hasUseCases) context += `USE CASES: ${useCases.length} identified, ${useCases.filter((u: any) => u.isPilot).length} pilots.\n`;
      if (hasScope) context += `SCOPE: ${scopeItems.length} items.\n`;

      const result = await chatMutation.mutateAsync({
        message: `Summarize what we know so far for ${workshop.customerName}'s workshop in 3-4 sentences. What are the key themes, critical findings, and what should be focused on in the ${currentStage} stage? Be specific.\n\n${context}`,
        context: { page: 'workshop-whiteboard' },
      });
      setSummary(result.response);
    } catch { setSummary('Unable to generate summary.'); }
    setGenerating(false);
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Progress bar */}
      <div className="flex items-center gap-0 h-1.5">
        {stages.map((stage, i) => (
          <div key={stage.id} className={`flex-1 h-full ${
            i < currentIdx ? (stage.done ? 'bg-[#0FB5AD]' : 'bg-[#0FB5AD]/20') :
            i === currentIdx ? 'bg-[#f59e0b]' : 'bg-border'
          }`} />
        ))}
      </div>

      {/* Summary header */}
      <div className="flex items-center gap-2 px-4 py-2.5 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-1.5 flex-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#0FB5AD]">Prior Inputs</span>
          {priorStages.map((s, i) => (
            <span key={s.id} className="flex items-center gap-1">
              {i > 0 && <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />}
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#0FB5AD]/10 text-[#0FB5AD]">{s.label}</span>
            </span>
          ))}
          <span className="text-[9px] text-muted-foreground ml-1">{totalInputs} total inputs</span>
        </div>
        <button onClick={(e) => { e.stopPropagation(); handleGenerateSummary(); }} disabled={generating}
          className="flex items-center gap-1 px-2.5 py-1 text-[9px] rounded-lg bg-[#7c3aed]/10 text-[#7c3aed] hover:bg-[#7c3aed]/20 disabled:opacity-40 transition-colors">
          {generating ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Sparkles className="h-2.5 w-2.5" />}
          {summary ? 'Refresh' : 'Summarize'}
        </button>
        {expanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-3 border-t border-border/50 pt-2 space-y-2">
          {/* Per-stage stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {stages.slice(0, currentIdx).map(stage => (
              <div key={stage.id} className={`px-3 py-2 rounded-lg ${stage.done ? 'bg-[#0FB5AD]/5 border border-[#0FB5AD]/20' : 'bg-muted/20 border border-border/50'}`}>
                <div className="text-[9px] font-semibold text-foreground">{stage.label}</div>
                <div className="text-[8px] text-muted-foreground mt-0.5">{stage.stats || 'Not started'}</div>
              </div>
            ))}
          </div>

          {/* AI Summary */}
          {summary && (
            <div className="p-3 rounded-lg bg-[#7c3aed]/5 border border-[#7c3aed]/20">
              <div className="text-[9px] font-mono uppercase tracking-wider text-[#7c3aed] mb-1 flex items-center gap-1">
                <Sparkles className="h-2.5 w-2.5" /> AI Summary
              </div>
              <p className="text-[10px] text-foreground leading-relaxed">{summary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
