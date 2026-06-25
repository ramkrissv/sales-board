'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  Sparkles, Loader2, ChevronRight, Check, Building2,
  Target, Users, FileText, Layers, BarChart3, Zap,
  ArrowRight, Plus, X,
} from 'lucide-react';

interface WorkshopIntakeProps {
  workshop: any;
  onRefresh: () => void;
}

const INTAKE_SECTIONS = [
  {
    id: 'business',
    title: 'Business Context',
    icon: Building2,
    color: '#7c3aed',
    questions: [
      { id: 'biz_drivers', label: 'What is driving this initiative?', placeholder: 'e.g. Cost reduction, competitive pressure, regulatory compliance, growth enablement...', type: 'textarea' },
      { id: 'biz_outcomes', label: 'What outcomes does the business expect?', placeholder: 'e.g. 30% reduction in operational costs, faster time-to-market, improved customer experience...', type: 'textarea' },
      { id: 'biz_timeline', label: 'What is the expected timeline?', placeholder: 'e.g. 6 months for POC, 12-18 months full rollout', type: 'text' },
      { id: 'biz_budget', label: 'Investment range / budget context', placeholder: 'e.g. $500K-$1M for Phase 1', type: 'text' },
    ],
  },
  {
    id: 'technical',
    title: 'Technical Landscape',
    icon: Layers,
    color: '#0A867F',
    questions: [
      { id: 'tech_current', label: 'Current technology stack & platforms', placeholder: 'e.g. Java/Spring, Oracle DB, on-prem VMware, some AWS...', type: 'textarea' },
      { id: 'tech_pain', label: 'Key technical pain points', placeholder: 'e.g. Scaling issues, legacy monolith, slow deployments, lack of observability...', type: 'textarea' },
      { id: 'tech_constraints', label: 'Constraints & non-negotiables', placeholder: 'e.g. Must stay on AWS, PCI compliance required, no downtime during billing cycles...', type: 'textarea' },
    ],
  },
  {
    id: 'people',
    title: 'People & Organization',
    icon: Users,
    color: '#3b82f6',
    questions: [
      { id: 'people_team', label: 'Current team size & structure', placeholder: 'e.g. 40 engineers, 2 teams, no dedicated SRE, outsourced QA...', type: 'textarea' },
      { id: 'people_skills', label: 'Skill gaps & needs', placeholder: 'e.g. No cloud-native expertise, need ML engineers, lack of DevOps culture...', type: 'textarea' },
      { id: 'people_stakeholders', label: 'Key stakeholders & decision makers', placeholder: 'e.g. CTO (sponsor), VP Eng (technical lead), CFO (budget approval)...', type: 'textarea' },
    ],
  },
  {
    id: 'outcomes',
    title: 'Desired Outcomes & Success Criteria',
    icon: Target,
    color: '#22c55e',
    questions: [
      { id: 'out_success', label: 'How will you measure success?', placeholder: 'e.g. Deployment frequency >10x/week, MTTR <1hr, 99.9% uptime...', type: 'textarea' },
      { id: 'out_risks', label: 'What are the biggest risks?', placeholder: 'e.g. Key person dependency, vendor lock-in, timeline pressure, budget constraints...', type: 'textarea' },
      { id: 'out_previous', label: 'Previous attempts & lessons learned', placeholder: 'e.g. Tried cloud migration 2 years ago, stalled due to data complexity...', type: 'textarea' },
    ],
  },
];

export default function WorkshopIntake({ workshop, onRefresh }: WorkshopIntakeProps) {
  const [activeSection, setActiveSection] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(
    (workshop.meta?.intake as Record<string, string>) || {}
  );
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiInsights, setAiInsights] = useState<string | null>(null);

  const updateMeta = trpc.workshop.updateMeta.useMutation({ onSuccess: onRefresh });
  const chatMutation = trpc.ai.chat.useMutation();

  const handleSave = () => {
    updateMeta.mutate({
      id: workshop.id,
      description: JSON.stringify({ intake: answers }),
    });
  };

  const handleAnalyze = () => {
    setAiAnalyzing(true);
    const answeredPairs = Object.entries(answers)
      .filter(([, v]) => v.trim())
      .map(([k, v]) => {
        const q = INTAKE_SECTIONS.flatMap(s => s.questions).find(q => q.id === k);
        return `${q?.label || k}: ${v}`;
      }).join('\n');

    chatMutation.mutate({
      message: `Analyze this workshop intake for ${workshop.customerName} and provide strategic insights.

INTAKE RESPONSES:
${answeredPairs}

Provide:
1. Key themes and patterns (2-3 bullet points)
2. Assessment focus areas to prioritize (which dimensions matter most)
3. Potential blind spots the client hasn't mentioned
4. Recommended engagement approach (workshop type, duration, team)

Be concise — max 200 words total.`,
      context: { page: 'workshop-intake' },
    }, {
      onSuccess: (data) => { setAiInsights(data.response); setAiAnalyzing(false); },
      onError: () => setAiAnalyzing(false),
    });
  };

  const section = INTAKE_SECTIONS[activeSection];
  const answeredCount = Object.values(answers).filter(v => v.trim()).length;
  const totalQuestions = INTAKE_SECTIONS.reduce((s, sec) => s + sec.questions.length, 0);

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Assessment Intake</h3>
          <p className="text-[10px] text-muted-foreground">{answeredCount}/{totalQuestions} questions answered</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-32 h-1.5 rounded-full bg-secondary overflow-hidden">
            <div className="h-full rounded-full bg-[#0A867F] transition-all" style={{ width: `${(answeredCount / totalQuestions) * 100}%` }} />
          </div>
          <button onClick={handleAnalyze} disabled={aiAnalyzing || answeredCount < 3}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A867F] text-white text-[10px] font-medium disabled:opacity-40">
            {aiAnalyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            Analyze Intake
          </button>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1">
        {INTAKE_SECTIONS.map((sec, i) => {
          const sectionAnswered = sec.questions.filter(q => answers[q.id]?.trim()).length;
          const isActive = i === activeSection;
          return (
            <button key={sec.id} onClick={() => setActiveSection(i)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-medium transition-all ${
                isActive ? 'bg-card border border-border shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}>
              <sec.icon className="h-3 w-3" style={{ color: isActive ? sec.color : undefined }} />
              {sec.title}
              {sectionAnswered > 0 && (
                <span className="text-[8px] px-1 py-0.5 rounded-full bg-[#0A867F]/10 text-[#0A867F]">{sectionAnswered}/{sec.questions.length}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active section questions */}
      <div className="p-5 rounded-xl bg-card border border-border space-y-4">
        <div className="flex items-center gap-2">
          <section.icon className="h-4 w-4" style={{ color: section.color }} />
          <span className="text-xs font-semibold text-foreground">{section.title}</span>
        </div>

        {section.questions.map(q => (
          <div key={q.id}>
            <label className="text-[10px] text-foreground font-medium mb-1.5 block">{q.label}</label>
            {q.type === 'textarea' ? (
              <textarea value={answers[q.id] || ''} onChange={e => setAnswers(p => ({ ...p, [q.id]: e.target.value }))}
                onBlur={handleSave} placeholder={q.placeholder} rows={3}
                className="w-full px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#0A867F]/40 resize-none" />
            ) : (
              <input value={answers[q.id] || ''} onChange={e => setAnswers(p => ({ ...p, [q.id]: e.target.value }))}
                onBlur={handleSave} placeholder={q.placeholder}
                className="w-full px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#0A867F]/40" />
            )}
          </div>
        ))}

        {/* Navigation */}
        <div className="flex justify-between pt-2">
          <button onClick={() => setActiveSection(Math.max(0, activeSection - 1))} disabled={activeSection === 0}
            className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30">← Previous</button>
          <button onClick={() => setActiveSection(Math.min(INTAKE_SECTIONS.length - 1, activeSection + 1))}
            disabled={activeSection === INTAKE_SECTIONS.length - 1}
            className="flex items-center gap-1 text-xs text-[#0A867F] hover:underline disabled:opacity-30">
            Next <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* AI Insights */}
      {aiInsights && (
        <div className="p-4 rounded-xl bg-[#0A867F]/5 border border-[#0A867F]/20 space-y-2 animate-flow-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#0A867F] uppercase tracking-wider">
              <Sparkles className="h-3 w-3" /> AI Intake Analysis
            </div>
            <button onClick={() => setAiInsights(null)} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
          </div>
          <div className="text-xs text-foreground leading-relaxed whitespace-pre-line">{aiInsights}</div>
        </div>
      )}
    </div>
  );
}
