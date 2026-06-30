'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  Plus, Trash2, Pencil, Check, X, LayoutGrid, MessageSquare,
  Sparkles, Loader2, ChevronDown, ChevronRight, FileText,
  Mic, Square, Upload, Camera, Target, Shield, Users,
  Layers, Zap, AlertTriangle, Lightbulb, Eye, HelpCircle,
  CheckCircle, Send, ThumbsUp, GripVertical, FolderPlus,
} from 'lucide-react';

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */
interface Note {
  id: string;
  text: string;
  color: string;
  groupId: string;
  subGroupId?: string;
  votes: number;
  type: 'note' | 'audio' | 'file';
  fileName?: string;
  ts: number;
}

interface SubGroup {
  id: string;
  title: string;
}

interface Group {
  id: string;
  title: string;
  icon: string;
  color: string;
  expanded: boolean;
  subGroups: SubGroup[];
}

const ICON_MAP: Record<string, any> = {
  discovery: Eye, pain: AlertTriangle, opportunity: Lightbulb,
  assessment: Layers, workstream: Target, risk: Shield,
  people: Users, quickwin: Zap, question: HelpCircle,
  decision: CheckCircle, general: LayoutGrid,
};

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */
interface Props { workshop: any; onRefresh: () => void; }

export default function WorkshopWhiteboard({ workshop, onRefresh }: Props) {
  const levels = workshop.framework?.levels || [];
  const workstreams = workshop.framework?.workstreams || [];
  const saved = (workshop as any).whiteboard;

  // Build 5 top-level groups with sub-groups
  const buildGroups = (): Group[] => [
    {
      id: 'discovery', title: 'Discovery & Observations', icon: 'discovery', color: '#3b82f6',
      expanded: true,
      subGroups: [
        { id: 'obs', title: 'Key Observations' },
        { id: 'pain', title: 'Pain Points' },
        { id: 'opp', title: 'Opportunities' },
        { id: 'questions', title: 'Open Questions' },
      ],
    },
    {
      id: 'assessment', title: 'Assessment Domains', icon: 'assessment', color: '#0FB5AD',
      expanded: false,
      subGroups: levels.map((l: any, i: number) => ({
        id: `level-${l.id || i}`,
        title: `${l.code || `L${i + 1}`}: ${l.name}`,
      })),
    },
    {
      id: 'workstreams', title: 'Workstream Tracks', icon: 'workstream', color: '#7c3aed',
      expanded: false,
      subGroups: workstreams.map((ws: any) => ({
        id: `ws-${ws.code}`,
        title: `${ws.code}: ${ws.name}`,
      })),
    },
    {
      id: 'strategy', title: 'Strategy & Planning', icon: 'quickwin', color: '#f59e0b',
      expanded: false,
      subGroups: [
        { id: 'quickwins', title: 'Quick Wins' },
        { id: 'strategic', title: 'Strategic Themes' },
        { id: 'decisions', title: 'Decisions Made' },
        { id: 'risks', title: 'Risks & Mitigations' },
      ],
    },
    {
      id: 'context', title: 'People, Process & Architecture', icon: 'people', color: '#22c55e',
      expanded: false,
      subGroups: [
        { id: 'people', title: 'People & Organization' },
        { id: 'process', title: 'Processes & Governance' },
        { id: 'arch', title: 'Architecture & Technology' },
        { id: 'data', title: 'Data & Integration' },
      ],
    },
  ];

  const [groups, setGroups] = useState<Group[]>(saved?.groups?.length > 0 ? saved.groups : buildGroups());
  const [notes, setNotes] = useState<Note[]>(saved?.notes || []);
  const [freeformText, setFreeformText] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [chatThinking, setChatThinking] = useState(false);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState('');
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newSubGroup, setNewSubGroup] = useState<string | null>(null);
  const [newSubTitle, setNewSubTitle] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [ocrProcessing, setOcrProcessing] = useState(false);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatMutation = trpc.ai.chat.useMutation();
  const saveWb = trpc.workshop.saveWhiteboard.useMutation();

  // Auto-save
  const saveRef = useRef<any>(null);
  const persist = useCallback((g: Group[], n: Note[]) => {
    if (saveRef.current) clearTimeout(saveRef.current);
    saveRef.current = setTimeout(() => {
      saveWb.mutate({ workshopId: workshop.id, sections: g as any, notes: n as any });
    }, 1200);
  }, [workshop.id]);

  const setG = (fn: (p: Group[]) => Group[]) => setGroups(p => { const n = fn(p); persist(n, notes); return n; });
  const setN = (fn: (p: Note[]) => Note[]) => setNotes(p => { const n = fn(p); persist(groups, n); return n; });

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  // ── Freeform input → AI auto-categorize ──
  const handleFreeformSubmit = async () => {
    if (!freeformText.trim()) return;
    const text = freeformText.trim();
    setFreeformText('');

    // Ask AI to categorize into the right group/subgroup
    try {
      const allGroups = groups.map(g => `${g.title}: ${g.subGroups.map(s => s.title).join(', ')}`).join('\n');
      const result = await chatMutation.mutateAsync({
        message: `Categorize this workshop note into the best matching group and subgroup. Return ONLY JSON: {"groupId":"<id>","subGroupId":"<id>","processedText":"<cleaned note text>"}\n\nGroups:\n${allGroups}\n\nGroup IDs: ${groups.map(g => g.id).join(', ')}\nSubGroup IDs: ${groups.flatMap(g => g.subGroups.map(s => `${g.id}/${s.id}`)).join(', ')}\n\nNote: "${text}"`,
        context: { page: 'workshop-whiteboard' },
      });
      const match = result.response.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        const targetGroup = groups.find(g => g.id === parsed.groupId) || groups[0];
        const targetSub = targetGroup.subGroups.find(s => s.id === parsed.subGroupId) || targetGroup.subGroups[0];
        setN(prev => [...prev, { id: uid(), text: parsed.processedText || text, color: targetGroup.color, groupId: targetGroup.id, subGroupId: targetSub?.id, votes: 0, type: 'note', ts: Date.now() }]);
        // Auto-expand the target group
        setG(prev => prev.map(g => g.id === targetGroup.id ? { ...g, expanded: true } : g));
      } else {
        setN(prev => [...prev, { id: uid(), text, color: '#3b82f6', groupId: 'discovery', subGroupId: 'obs', votes: 0, type: 'note', ts: Date.now() }]);
      }
    } catch {
      setN(prev => [...prev, { id: uid(), text, color: '#3b82f6', groupId: 'discovery', subGroupId: 'obs', votes: 0, type: 'note', ts: Date.now() }]);
    }
  };

  // ── AI Copilot Chat ──
  const handleChat = async () => {
    if (!chatInput.trim() || chatThinking) return;
    const msg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: msg }]);
    setChatThinking(true);

    const noteSummary = groups.map(g => {
      const gNotes = notes.filter(n => n.groupId === g.id);
      return gNotes.length > 0 ? `${g.title} (${gNotes.length}):\n${gNotes.map(n => `  - ${n.text}`).join('\n')}` : '';
    }).filter(Boolean).join('\n');

    try {
      const result = await chatMutation.mutateAsync({
        message: `You are a discovery facilitator for ${workshop.customerName}'s assessment workshop. Help organize whiteboard notes.

CURRENT WHITEBOARD (${notes.length} notes):
${noteSummary || '(empty)'}

USER: ${msg}

If the user provides observations, create notes. Return any new notes as: [NOTE: group=<groupId> sub=<subGroupId> text=<note text>]
Otherwise, respond with insights about the whiteboard content. Be concise (2-3 sentences).`,
        context: { page: 'workshop-whiteboard' },
      });

      const response = result.response;
      // Extract any notes the AI suggests
      const noteMatches = response.matchAll(/\[NOTE:\s*group=(\S+)\s+sub=(\S+)\s+text=([^\]]+)\]/g);
      for (const match of noteMatches) {
        const [, groupId, subId, text] = match;
        const group = groups.find(g => g.id === groupId) || groups[0];
        setN(prev => [...prev, { id: uid(), text: text.trim(), color: group.color, groupId: group.id, subGroupId: subId, votes: 0, type: 'note', ts: Date.now() }]);
      }
      const clean = response.replace(/\[NOTE:[^\]]+\]/g, '').trim();
      if (clean) setChatMessages(prev => [...prev, { role: 'ai', text: clean }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'ai', text: 'Unable to respond.' }]);
    }
    setChatThinking(false);
  };

  // ── Audio recording ──
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        setN(prev => [...prev, { id: uid(), text: `Voice note (${Math.floor(recordTime / 60)}:${String(recordTime % 60).padStart(2, '0')})`, color: '#3b82f6', groupId: 'discovery', subGroupId: 'obs', votes: 0, type: 'audio', ts: Date.now() }]);
      };
      recorder.start();
      mediaRef.current = recorder;
      setIsRecording(true);
      setRecordTime(0);
      timerRef.current = setInterval(() => setRecordTime(t => t + 1), 1000);
    } catch {}
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // ── Image OCR → auto-section ──
  const handleImageOCR = async (file: File) => {
    setOcrProcessing(true);
    try {
      const allSubs = groups.flatMap(g => g.subGroups.map(s => `${g.id}/${s.id}: ${s.title}`)).join(', ');
      const result = await chatMutation.mutateAsync({
        message: `Extract ALL text from this whiteboard/sticky note photo for ${workshop.customerName}. Return JSON array: [{"text":"<note>","groupId":"<group>","subGroupId":"<sub>"}]. Available groups/subs: ${allSubs}. One object per distinct note/item visible.`,
        context: { page: 'workshop-whiteboard' },
      });
      const match = result.response.match(/\[[\s\S]*\]/);
      if (match) {
        const items = JSON.parse(match[0]);
        items.forEach((item: any) => {
          const group = groups.find(g => g.id === item.groupId) || groups[0];
          setN(prev => [...prev, { id: uid(), text: item.text, color: group.color, groupId: group.id, subGroupId: item.subGroupId, votes: 0, type: 'note', ts: Date.now() }]);
        });
      }
    } catch {}
    setOcrProcessing(false);
  };

  // ── File upload ──
  const handleFile = (file: File, groupId: string, subId?: string) => {
    if (file.type.startsWith('image/')) {
      handleImageOCR(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const content = file.name.endsWith('.pdf') || file.name.endsWith('.docx')
        ? `${file.name} (${(file.size / 1024).toFixed(0)} KB)`
        : (reader.result as string).slice(0, 500);
      setN(prev => [...prev, { id: uid(), text: content, color: '#f59e0b', groupId, subGroupId: subId, votes: 0, type: 'file', fileName: file.name, ts: Date.now() }]);
    };
    reader.readAsText(file);
  };

  // ── Add sub-group to a group ──
  const addSubGroup = (groupId: string) => {
    if (!newSubTitle.trim()) return;
    setG(prev => prev.map(g => g.id === groupId ? { ...g, subGroups: [...g.subGroups, { id: uid(), title: newSubTitle.trim() }] } : g));
    setNewSubTitle('');
    setNewSubGroup(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
      {/* ═══════ MAIN AREA ═══════ */}
      <div className="space-y-4">
        {/* Freeform input — AI auto-categorizes */}
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-[#f59e0b]" />
            <span className="text-sm font-semibold text-foreground">Discovery Whiteboard</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f59e0b]/10 text-[#f59e0b] font-medium ml-auto">{notes.length} notes</span>
          </div>

          <div className="p-4">
            <div className="flex gap-2">
              <textarea value={freeformText} onChange={e => setFreeformText(e.target.value)}
                placeholder="Type an observation, paste notes, or describe what you see — AI will automatically categorize it into the right section..."
                rows={2}
                className="flex-1 px-3 py-2.5 text-xs bg-secondary/30 border border-border rounded-lg text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-[#f59e0b]/40"
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleFreeformSubmit(); } }} />
              <div className="flex flex-col gap-1.5 shrink-0">
                <button onClick={handleFreeformSubmit} disabled={!freeformText.trim()}
                  className="px-3 py-2 rounded-lg bg-[#f59e0b] text-white text-[10px] font-medium disabled:opacity-40 transition-colors hover:bg-[#d97706]">
                  <Sparkles className="h-3.5 w-3.5" />
                </button>
                {/* Voice record */}
                {isRecording ? (
                  <button onClick={stopRecording} className="px-3 py-2 rounded-lg bg-red-500 text-white text-[10px]">
                    <Square className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button onClick={startRecording} className="px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-red-400 text-[10px] transition-colors">
                    <Mic className="h-3.5 w-3.5" />
                  </button>
                )}
                {/* Camera OCR */}
                <label className="px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-[#0A867F] text-[10px] cursor-pointer transition-colors text-center">
                  <Camera className="h-3.5 w-3.5 mx-auto" />
                  <input type="file" className="hidden" accept="image/*" capture="environment"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleImageOCR(f); e.target.value = ''; }} />
                </label>
              </div>
            </div>
            {isRecording && (
              <div className="mt-2 flex items-center gap-2 text-red-400 text-[10px]">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                Recording {Math.floor(recordTime / 60)}:{String(recordTime % 60).padStart(2, '0')}
              </div>
            )}
            {ocrProcessing && (
              <div className="mt-2 flex items-center gap-2 text-[#0A867F] text-[10px]">
                <Loader2 className="h-3 w-3 animate-spin" /> Extracting text from image...
              </div>
            )}
          </div>
        </div>

        {/* ═══════ GROUPED SECTIONS ═══════ */}
        {groups.map(group => {
          const Icon = ICON_MAP[group.icon] || LayoutGrid;
          const groupNotes = notes.filter(n => n.groupId === group.id);
          const totalVotes = groupNotes.reduce((s, n) => s + n.votes, 0);

          return (
            <div key={group.id} className="rounded-xl border overflow-hidden transition-colors"
              style={{ borderColor: group.expanded ? group.color + '40' : 'var(--g-line, rgba(255,255,255,0.08))' }}>
              {/* Group header */}
              <button onClick={() => setG(prev => prev.map(g => g.id === group.id ? { ...g, expanded: !g.expanded } : g))}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/10 transition-colors">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: group.color + '15' }}>
                  <Icon className="h-4 w-4" style={{ color: group.color }} />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-xs font-semibold text-foreground">{group.title}</div>
                  <div className="text-[10px] text-muted-foreground">{group.subGroups.length} sections · {groupNotes.length} notes{totalVotes > 0 ? ` · ${totalVotes} votes` : ''}</div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-medium" style={{ backgroundColor: group.color + '15', color: group.color }}>
                  {groupNotes.length}
                </span>
                {group.expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>

              {/* Expanded: sub-groups */}
              {group.expanded && (
                <div className="border-t border-border">
                  {group.subGroups.map(sub => {
                    const subNotes = groupNotes.filter(n => n.subGroupId === sub.id || (!n.subGroupId && sub === group.subGroups[0]));
                    return (
                      <div key={sub.id} className="border-b border-border/50 last:border-b-0">
                        <div className="flex items-center gap-2 px-5 py-2 bg-muted/5">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: group.color }} />
                          <span className="text-[10px] font-medium text-foreground flex-1">{sub.title}</span>
                          <span className="text-[9px] text-muted-foreground">{subNotes.length}</span>
                          {/* Upload into this sub-section */}
                          <label className="p-0.5 rounded text-muted-foreground hover:text-foreground cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                            <Upload className="h-2.5 w-2.5" />
                            <input type="file" className="hidden" accept=".pdf,.docx,.txt,.csv,.png,.jpg,.jpeg"
                              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f, group.id, sub.id); e.target.value = ''; }} />
                          </label>
                        </div>
                        {/* Notes in this sub-section */}
                        {subNotes.length > 0 && (
                          <div className="px-5 py-2 flex flex-wrap gap-2">
                            {subNotes.map(note => (
                              <div key={note.id} draggable onDragStart={() => {}}
                                className="w-[190px] rounded-lg p-2.5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 group/note"
                                style={{ backgroundColor: note.color + '12', border: `1px solid ${note.color}25` }}>
                                {editingNote === note.id ? (
                                  <div className="space-y-1">
                                    <textarea value={editBuffer} onChange={e => setEditBuffer(e.target.value)}
                                      className="w-full px-1.5 py-1 text-[10px] bg-card border border-border rounded resize-none text-foreground" rows={3} autoFocus />
                                    <div className="flex gap-1 justify-end">
                                      <button onClick={() => setEditingNote(null)} className="p-0.5 text-muted-foreground"><X className="h-2.5 w-2.5" /></button>
                                      <button onClick={() => { setN(prev => prev.map(n => n.id === note.id ? { ...n, text: editBuffer } : n)); setEditingNote(null); }}
                                        className="p-0.5 text-emerald-400"><Check className="h-2.5 w-2.5" /></button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <p className="text-[10px] leading-relaxed text-foreground mb-1.5 whitespace-pre-wrap line-clamp-4">{note.text}</p>
                                    <div className="flex items-center gap-1">
                                      <button onClick={() => setN(prev => prev.map(n => n.id === note.id ? { ...n, votes: n.votes + 1 } : n))}
                                        className="text-[8px] px-1.5 py-0.5 rounded-full font-medium hover:bg-muted/30 transition-colors" style={{ color: note.color }}>
                                        <ThumbsUp className="h-2 w-2 inline mr-0.5" />{note.votes}
                                      </button>
                                      {note.type !== 'note' && <span className="text-[7px] px-1 rounded bg-muted text-muted-foreground">{note.type}</span>}
                                      <div className="flex-1" />
                                      <button onClick={() => { setEditingNote(note.id); setEditBuffer(note.text); }}
                                        className="p-0.5 opacity-0 group-hover/note:opacity-60 text-muted-foreground"><Pencil className="h-2.5 w-2.5" /></button>
                                      <button onClick={() => setN(prev => prev.filter(n => n.id !== note.id))}
                                        className="p-0.5 opacity-0 group-hover/note:opacity-60 text-red-400"><Trash2 className="h-2.5 w-2.5" /></button>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Quick add note to sub-section */}
                        {addingTo === `${group.id}/${sub.id}` ? (
                          <div className="px-5 py-2">
                            <div className="flex gap-1.5">
                              <input value={freeformText} onChange={e => setFreeformText(e.target.value)}
                                placeholder="Add note..." autoFocus
                                className="flex-1 px-2 py-1.5 text-[10px] bg-card border border-border rounded-lg text-foreground"
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    setN(prev => [...prev, { id: uid(), text: freeformText.trim(), color: group.color, groupId: group.id, subGroupId: sub.id, votes: 0, type: 'note', ts: Date.now() }]);
                                    setFreeformText('');
                                    setAddingTo(null);
                                  }
                                  if (e.key === 'Escape') setAddingTo(null);
                                }} />
                              <button onClick={() => setAddingTo(null)} className="text-[9px] text-muted-foreground">Esc</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => { setAddingTo(`${group.id}/${sub.id}`); setFreeformText(''); }}
                            className="w-full text-left px-5 py-1.5 text-[9px] text-muted-foreground hover:text-foreground hover:bg-muted/10 transition-colors">
                            <Plus className="h-2.5 w-2.5 inline mr-1" />Add note
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {/* Add sub-group */}
                  {newSubGroup === group.id ? (
                    <div className="px-5 py-2 flex gap-1.5 border-t border-border/50">
                      <input value={newSubTitle} onChange={e => setNewSubTitle(e.target.value)}
                        placeholder="Sub-section title..." autoFocus
                        className="flex-1 px-2 py-1.5 text-[10px] bg-card border border-border rounded-lg text-foreground"
                        onKeyDown={e => { if (e.key === 'Enter') addSubGroup(group.id); if (e.key === 'Escape') setNewSubGroup(null); }} />
                      <button onClick={() => addSubGroup(group.id)} disabled={!newSubTitle.trim()}
                        className="px-2 py-1 text-[9px] rounded-lg bg-foreground/10 text-foreground disabled:opacity-40">Add</button>
                      <button onClick={() => setNewSubGroup(null)} className="text-[9px] text-muted-foreground">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setNewSubGroup(group.id)}
                      className="w-full text-left px-5 py-2 text-[9px] text-muted-foreground hover:text-foreground hover:bg-muted/10 transition-colors border-t border-border/50">
                      <FolderPlus className="h-2.5 w-2.5 inline mr-1" />Add sub-section to {group.title}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ═══════ AI COPILOT SIDEBAR ═══════ */}
      <div className="rounded-xl bg-card border border-border overflow-hidden h-fit sticky top-20">
        <div className="px-4 py-3 bg-[#0B1120] text-white flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-[#0FB5AD]" />
          <span className="text-xs font-semibold">Discovery Copilot</span>
          <span className="text-[9px] text-white/40 ml-auto">{notes.length} notes</span>
        </div>

        {/* Chat messages */}
        <div className="max-h-[350px] overflow-y-auto p-3 space-y-2">
          {chatMessages.length === 0 && (
            <div className="space-y-2 py-2">
              <p className="text-[10px] text-muted-foreground text-center">Describe observations or upload content — AI organizes it</p>
              {[
                'What patterns do you see across all notes?',
                'Summarize the whiteboard into key themes',
                `What should we focus on for ${workshop.customerName}?`,
                'Suggest dimensions to add based on these observations',
              ].map((q, i) => (
                <button key={i} onClick={() => { setChatInput(q); }}
                  className="w-full text-left px-3 py-2 rounded-lg bg-secondary/30 text-[10px] text-foreground hover:bg-secondary/50 transition-colors">
                  {q}
                </button>
              ))}
            </div>
          )}
          {chatMessages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] px-3 py-2 rounded-xl text-[10px] leading-relaxed ${
                msg.role === 'user' ? 'bg-[#f59e0b] text-white rounded-tr-sm' : 'bg-secondary/50 text-foreground rounded-tl-sm'
              }`}>{msg.text}</div>
            </div>
          ))}
          {chatThinking && (
            <div className="flex justify-start">
              <div className="px-3 py-2 rounded-xl bg-secondary/50 text-[10px] text-muted-foreground rounded-tl-sm flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin text-[#f59e0b]" /> Thinking...
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat input */}
        <div className="px-3 py-2 border-t border-border">
          <div className="flex gap-1.5">
            <label className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground cursor-pointer shrink-0">
              <Upload className="h-3.5 w-3.5" />
              <input type="file" className="hidden" accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
                onChange={e => { const f = e.target.files?.[0]; if (f) { if (f.type.startsWith('image/')) handleImageOCR(f); else handleFile(f, 'discovery', 'obs'); } e.target.value = ''; }} />
            </label>
            <input value={chatInput} onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleChat()}
              placeholder="Ask, describe, or paste..."
              className="flex-1 px-3 py-1.5 text-[10px] bg-secondary/30 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#f59e0b]/40" />
            <button onClick={handleChat} disabled={!chatInput.trim() || chatThinking}
              className="p-1.5 rounded-lg bg-[#f59e0b] text-white disabled:opacity-40">
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
