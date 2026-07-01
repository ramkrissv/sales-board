'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { trpc } from '@/lib/trpc/client';
import {
  Plus, Trash2, Pencil, Check, X, LayoutGrid,
  Sparkles, Loader2, ChevronDown, ChevronRight,
  Mic, Square, Upload, Camera, Send, ThumbsUp,
  ZoomIn, ZoomOut, Maximize2, Minimize2, StickyNote, Type,
  Eye, AlertTriangle, Lightbulb, Layers, Target,
  Shield, Users, Zap, FolderPlus, FileText, Image,
  PenTool, Shapes, ArrowRight, Move,
} from 'lucide-react';
import { ENTERPRISE_AI_WORKSHOP_TEMPLATE, templateToWhiteboardZones } from '@/lib/workshop/pptx-templates';

// Dynamic import Excalidraw (no SSR — it uses DOM APIs)
const Excalidraw = dynamic(
  () => import('@excalidraw/excalidraw').then(mod => mod.Excalidraw),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full text-muted-foreground text-xs"><Loader2 className="h-4 w-4 animate-spin mr-2" />Loading whiteboard...</div> }
);

const STICKY_COLORS = [
  { id: 'yellow', bg: '#FEF3C7', shadow: '#F59E0B', text: '#92400E' },
  { id: 'blue', bg: '#DBEAFE', shadow: '#3B82F6', text: '#1E3A5F' },
  { id: 'green', bg: '#D1FAE5', shadow: '#10B981', text: '#065F46' },
  { id: 'pink', bg: '#FCE7F3', shadow: '#EC4899', text: '#831843' },
  { id: 'purple', bg: '#EDE9FE', shadow: '#8B5CF6', text: '#4C1D95' },
  { id: 'orange', bg: '#FFEDD5', shadow: '#F97316', text: '#9A3412' },
];

// Accepted upload formats
const UPLOAD_ACCEPT = '.pdf,.doc,.docx,.pptx,.ppt,.xls,.xlsx,.csv,.txt,.md,.rtf,.html,.json,.xml,.png,.jpg,.jpeg,.gif,.webp,.svg,.bmp,.tiff,.heic';

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

interface Note {
  id: string;
  text: string;
  color: string;
  section: string;
  votes: number;
  type: 'note' | 'audio' | 'file' | 'image';
  fileName?: string;
  ts: number;
}

interface Section {
  id: string;
  title: string;
  color: string;
  source: 'deck' | 'framework' | 'custom';
  collapsed: boolean;
}

interface Props { workshop: any; onRefresh: () => void; }

export default function WorkshopWhiteboard({ workshop, onRefresh }: Props) {
  const levels = workshop.framework?.levels || [];
  const workstreams = workshop.framework?.workstreams || [];
  const saved = (workshop as any).whiteboard;

  // View mode: draw (Excalidraw) | notes (sticky notes + sections) | split (both)
  const [viewMode, setViewMode] = useState<'draw' | 'notes' | 'split'>('split');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Build sections from PPTX template + framework
  const buildSections = (): Section[] => {
    const sections: Section[] = [];
    // From the PPTX deck template
    const deckSections = [
      { title: 'The Mandate & Strategic Intent', color: '#3B82F6' },
      { title: 'Engagement Layers', color: '#8B5CF6' },
      { title: 'Operating Model — Hub & Spoke', color: '#EC4899' },
      { title: 'Pain Points & Strategic Drivers', color: '#EF4444' },
      { title: 'Current Ecosystem Snapshot', color: '#F59E0B' },
      { title: 'Discovery & Observations', color: '#3B82F6' },
      { title: 'Architecture & Building Blocks', color: '#8B5CF6' },
      { title: 'Outcomes & Next Steps', color: '#10B981' },
    ];
    deckSections.forEach((ds, i) => {
      sections.push({ id: `deck-${i}`, title: ds.title, color: ds.color, source: 'deck', collapsed: i > 2 });
    });
    // From framework levels
    levels.forEach((l: any, i: number) => {
      sections.push({ id: `level-${l.id || i}`, title: `${l.code || `L${i+1}`}: ${l.name}`, color: '#0FB5AD', source: 'framework', collapsed: true });
    });
    // From workstreams (top 4)
    workstreams.slice(0, 4).forEach((ws: any) => {
      sections.push({ id: `ws-${ws.code}`, title: `${ws.code}: ${ws.name}`, color: '#7c3aed', source: 'framework', collapsed: true });
    });
    return sections;
  };

  const [sections, setSections] = useState<Section[]>(saved?.sections?.length > 0 ? saved.sections.map((s: any) => ({ ...s, collapsed: s.collapsed ?? true })) : buildSections());
  const [notes, setNotes] = useState<Note[]>(saved?.notes || []);
  const [excalidrawData, setExcalidrawData] = useState<any>(saved?.drawingData || null);

  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [chatThinking, setChatThinking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newNoteText, setNewNoteText] = useState('');
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [showAddSection, setShowAddSection] = useState(false);

  const chatMutation = trpc.ai.chat.useMutation();
  const saveWb = trpc.workshop.saveWhiteboard.useMutation();
  const mediaRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const saveRef = useRef<any>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  // Auto-save
  const persist = useCallback((s: Section[], n: Note[], drawing?: any) => {
    if (saveRef.current) clearTimeout(saveRef.current);
    saveRef.current = setTimeout(() => {
      saveWb.mutate({
        workshopId: workshop.id,
        sections: s as any,
        notes: n.map(nt => ({ ...nt, sectionId: nt.section, groupId: nt.section })) as any,
      });
    }, 2000);
  }, [workshop.id]);

  const updateNotes = (fn: (p: Note[]) => Note[]) => setNotes(p => { const n = fn(p); persist(sections, n); return n; });
  const updateSections = (fn: (p: Section[]) => Section[]) => setSections(p => { const n = fn(p); persist(n, notes); return n; });

  // File upload — supports all common formats
  const handleFileUpload = (files: FileList | null, sectionId: string) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const isImage = file.type.startsWith('image/') || ['png','jpg','jpeg','gif','webp','svg','bmp'].includes(ext);

      if (isImage) {
        // Image → OCR
        handleImageOCR(file, sectionId);
      } else {
        // Document → create file note
        const sizeKB = (file.size / 1024).toFixed(0);
        const typeLabel = ext.toUpperCase();
        updateNotes(prev => [...prev, {
          id: uid(), text: `📄 ${file.name} (${sizeKB} KB · ${typeLabel})`, color: '#F59E0B',
          section: sectionId, votes: 0, type: 'file', fileName: file.name, ts: Date.now(),
        }]);

        // Try to read text content for txt/md/csv/html/json
        if (['txt','md','csv','html','json','xml','rtf'].includes(ext)) {
          const reader = new FileReader();
          reader.onload = () => {
            const content = (reader.result as string).slice(0, 1000);
            updateNotes(prev => prev.map(n =>
              n.fileName === file.name && n.type === 'file'
                ? { ...n, text: `📄 ${file.name}\n\n${content}${content.length >= 1000 ? '...' : ''}` }
                : n
            ));
          };
          reader.readAsText(file);
        }
      }
    });
  };

  // Image OCR
  const handleImageOCR = async (file: File, sectionId: string) => {
    setOcrProcessing(true);
    updateNotes(prev => [...prev, { id: uid(), text: `📷 ${file.name} — extracting text...`, color: '#10B981', section: sectionId, votes: 0, type: 'image', fileName: file.name, ts: Date.now() }]);
    try {
      const sectionNames = sections.map(s => `${s.id}: ${s.title}`).join(', ');
      const result = await chatMutation.mutateAsync({
        message: `Extract ALL text from this image (whiteboard photo, sticky notes, or diagram). Return JSON array: [{"text":"<note>","sectionId":"<best matching section>"}]. Sections: ${sectionNames}`,
        context: { page: 'workshop-whiteboard' },
      });
      const match = result.response.match(/\[[\s\S]*\]/);
      if (match) {
        const items = JSON.parse(match[0]);
        const colors = STICKY_COLORS.map(c => c.shadow);
        items.forEach((item: any, i: number) => {
          const sec = sections.find(s => s.id === item.sectionId) || sections[0];
          updateNotes(prev => [...prev, { id: uid(), text: item.text, color: colors[i % colors.length], section: sec?.id || sectionId, votes: 0, type: 'note', ts: Date.now() }]);
        });
      }
    } catch {}
    // Remove the "extracting" placeholder
    updateNotes(prev => prev.filter(n => !n.text.includes('extracting text...')));
    setOcrProcessing(false);
  };

  // Audio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      rec.onstop = () => { stream.getTracks().forEach(t => t.stop()); updateNotes(prev => [...prev, { id: uid(), text: `🎙 Voice note (${Math.floor(recordTime/60)}:${String(recordTime%60).padStart(2,'0')})`, color: '#3B82F6', section: sections[0]?.id || '', votes: 0, type: 'audio', ts: Date.now() }]); };
      rec.start(); mediaRef.current = rec; setIsRecording(true); setRecordTime(0);
      timerRef.current = setInterval(() => setRecordTime(t => t+1), 1000);
    } catch {}
  };
  const stopRecording = () => { mediaRef.current?.stop(); setIsRecording(false); if (timerRef.current) clearInterval(timerRef.current); };

  // AI Chat
  const handleChat = async () => {
    if (!chatInput.trim() || chatThinking) return;
    const msg = chatInput.trim(); setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: msg }]);
    setChatThinking(true);
    try {
      const notesSummary = sections.map(s => {
        const sNotes = notes.filter(n => n.section === s.id);
        return sNotes.length > 0 ? `${s.title} (${sNotes.length}):\n${sNotes.map(n => `  - ${n.text.slice(0, 80)}`).join('\n')}` : '';
      }).filter(Boolean).join('\n');

      const result = await chatMutation.mutateAsync({
        message: `Workshop whiteboard copilot for ${workshop.customerName}. ${notes.length} notes across ${sections.length} sections.\n\nCurrent notes:\n${notesSummary || '(empty)'}\n\nUser: ${msg}\n\nHelp organize and add notes. For new notes: [NOTE: section=<sectionId> text=<content>]`,
        context: { page: 'workshop-whiteboard' },
      });
      const resp = result.response;
      const noteMatches = resp.matchAll(/\[NOTE:\s*section=(\S+)\s+text=([^\]]+)\]/g);
      for (const m of noteMatches) {
        const sec = sections.find(s => s.id === m[1]) || sections[0];
        updateNotes(prev => [...prev, { id: uid(), text: m[2].trim(), color: sec?.color || '#3B82F6', section: sec?.id || '', votes: 0, type: 'note', ts: Date.now() }]);
      }
      const clean = resp.replace(/\[NOTE:[^\]]+\]/g, '').trim();
      if (clean) setChatMessages(prev => [...prev, { role: 'ai', text: clean }]);
    } catch { setChatMessages(prev => [...prev, { role: 'ai', text: 'Error — try again.' }]); }
    setChatThinking(false);
  };

  const totalNotes = notes.length;

  return (
    <div className={`flex flex-col ${isFullscreen ? 'g-fullscreen' : 'h-[calc(100vh-220px)]'}`}>
      {/* ═══════ TOOLBAR ═══════ */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card rounded-t-xl flex-wrap shrink-0">
        <LayoutGrid className="h-4 w-4 text-[#f59e0b]" />
        <span className="text-xs font-semibold text-foreground">Discovery Whiteboard</span>

        {/* View mode toggle */}
        <div className="flex gap-0.5 p-0.5 rounded-lg bg-secondary border border-border ml-2">
          {[
            { id: 'draw' as const, label: 'Draw', icon: PenTool },
            { id: 'notes' as const, label: 'Notes', icon: StickyNote },
            { id: 'split' as const, label: 'Split', icon: Layers },
          ].map(v => (
            <button key={v.id} onClick={() => setViewMode(v.id)}
              className={`flex items-center gap-1 px-2.5 py-1 text-[10px] rounded-md transition-colors ${viewMode === v.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
              <v.icon className="h-3 w-3" /> {v.label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Actions */}
        {isRecording ? (
          <button onClick={stopRecording} className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] rounded-lg bg-red-500 text-white">
            <Square className="h-3 w-3" /> {Math.floor(recordTime/60)}:{String(recordTime%60).padStart(2,'0')}
          </button>
        ) : (
          <button onClick={startRecording} className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-red-400" title="Record voice"><Mic className="h-3.5 w-3.5" /></button>
        )}
        <label className={`p-1.5 rounded-lg border border-border cursor-pointer ${ocrProcessing ? 'text-[#0FB5AD]' : 'text-muted-foreground hover:text-[#0FB5AD]'}`} title="Camera / image OCR">
          {ocrProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
          <input type="file" className="hidden" accept="image/*" capture="environment" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageOCR(f, sections[0]?.id || ''); e.target.value = ''; }} />
        </label>
        <label className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground cursor-pointer" title="Upload documents (PDF, DOCX, PPTX, images, etc.)">
          <Upload className="h-3.5 w-3.5" />
          <input type="file" className="hidden" multiple accept={UPLOAD_ACCEPT} onChange={e => { handleFileUpload(e.target.files, sections[0]?.id || ''); e.target.value = ''; }} />
        </label>

        <div className="flex-1" />

        <span className="text-[9px] text-muted-foreground">{totalNotes} notes · {sections.length} sections</span>
        <button onClick={() => setIsFullscreen(f => !f)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground" title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
          {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* ═══════ MAIN AREA ═══════ */}
      <div className={`flex-1 flex overflow-hidden ${viewMode === 'split' ? 'gap-0' : ''}`}>

        {/* DRAW VIEW — Excalidraw canvas */}
        {(viewMode === 'draw' || viewMode === 'split') && (
          <div className={`${viewMode === 'split' ? 'w-1/2 border-r border-border' : 'flex-1'} bg-white dark:bg-[#121212] overflow-hidden`}>
            <Excalidraw
              theme="light"
              onChange={(elements: any, state: any) => {
                setExcalidrawData({ elements, state });
              }}
              initialData={excalidrawData ? { elements: excalidrawData.elements } : undefined}
            />
          </div>
        )}

        {/* NOTES VIEW — Structured sections with sticky notes */}
        {(viewMode === 'notes' || viewMode === 'split') && (
          <div className={`${viewMode === 'split' ? 'w-1/2' : 'flex-1'} flex`}>
            {/* Sections panel */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {/* Add section */}
              {showAddSection ? (
                <div className="flex gap-2 p-2 rounded-lg bg-muted/20 border border-border">
                  <input value={newSectionTitle} onChange={e => setNewSectionTitle(e.target.value)}
                    placeholder="Section title..." autoFocus className="flex-1 px-2 py-1 text-xs bg-card border border-border rounded text-foreground"
                    onKeyDown={e => { if (e.key === 'Enter' && newSectionTitle.trim()) { updateSections(prev => [...prev, { id: uid(), title: newSectionTitle.trim(), color: '#3B82F6', source: 'custom', collapsed: false }]); setNewSectionTitle(''); setShowAddSection(false); } if (e.key === 'Escape') setShowAddSection(false); }} />
                  <button onClick={() => setShowAddSection(false)} className="text-[9px] text-muted-foreground">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setShowAddSection(true)} className="w-full text-left px-3 py-2 text-[10px] text-muted-foreground hover:text-foreground rounded-lg border border-dashed border-border hover:border-[#f59e0b]/30 transition-colors">
                  <Plus className="h-3 w-3 inline mr-1" /> Add section
                </button>
              )}

              {/* Section list */}
              {sections.map(section => {
                const sNotes = notes.filter(n => n.section === section.id).sort((a, b) => b.votes - a.votes);
                return (
                  <div key={section.id} className="rounded-xl border overflow-hidden transition-colors" style={{ borderColor: section.collapsed ? 'var(--g-line)' : section.color + '40' }}>
                    {/* Header */}
                    <div className="flex items-center gap-2 px-3 py-2 group/sec">
                      <button onClick={() => updateSections(prev => prev.map(s => s.id === section.id ? { ...s, collapsed: !s.collapsed } : s))} className="flex items-center gap-2 flex-1 text-left">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: section.color }} />
                        <span className="text-[11px] font-semibold text-foreground">{section.title}</span>
                        {section.source !== 'custom' && <span className="text-[8px] px-1 py-0.5 rounded bg-muted text-muted-foreground">{section.source}</span>}
                        <span className="text-[9px] text-muted-foreground">{sNotes.length}</span>
                      </button>
                      <label className="p-0.5 rounded text-muted-foreground hover:text-foreground cursor-pointer opacity-0 group-hover/sec:opacity-100">
                        <Upload className="h-2.5 w-2.5" />
                        <input type="file" className="hidden" multiple accept={UPLOAD_ACCEPT} onChange={e => { handleFileUpload(e.target.files, section.id); e.target.value = ''; }} />
                      </label>
                      <button onClick={() => updateSections(prev => prev.filter(s => s.id !== section.id))}
                        className="p-0.5 rounded text-muted-foreground hover:text-red-400 opacity-0 group-hover/sec:opacity-100"><Trash2 className="h-2.5 w-2.5" /></button>
                      {section.collapsed ? <ChevronRight className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
                    </div>

                    {/* Notes */}
                    {!section.collapsed && (
                      <div className="px-3 pb-2 space-y-1.5">
                        {sNotes.map(note => (
                          <div key={note.id} className="flex items-start gap-2 px-2 py-1.5 rounded-lg group/n hover:bg-muted/10 transition-colors"
                            style={{ borderLeft: `3px solid ${note.color}` }}>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] leading-relaxed text-foreground whitespace-pre-wrap">{note.text}</p>
                              {note.type !== 'note' && <span className="text-[8px] text-muted-foreground">{note.type}{note.fileName ? ` · ${note.fileName}` : ''}</span>}
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover/n:opacity-100 transition-opacity">
                              <button onClick={() => updateNotes(prev => prev.map(n => n.id === note.id ? { ...n, votes: n.votes + 1 } : n))}
                                className="text-[8px] px-1 py-0.5 rounded" style={{ color: note.color }}><ThumbsUp className="h-2 w-2 inline" /> {note.votes}</button>
                              <button onClick={() => updateNotes(prev => prev.filter(n => n.id !== note.id))} className="p-0.5 text-red-400"><Trash2 className="h-2.5 w-2.5" /></button>
                            </div>
                          </div>
                        ))}
                        {/* Quick add */}
                        {addingTo === section.id ? (
                          <div className="flex gap-1.5">
                            <input value={newNoteText} onChange={e => setNewNoteText(e.target.value)} autoFocus placeholder="Add note..."
                              className="flex-1 px-2 py-1 text-[10px] bg-card border border-border rounded text-foreground"
                              onKeyDown={e => { if (e.key === 'Enter' && newNoteText.trim()) { updateNotes(prev => [...prev, { id: uid(), text: newNoteText.trim(), color: section.color, section: section.id, votes: 0, type: 'note', ts: Date.now() }]); setNewNoteText(''); } if (e.key === 'Escape') setAddingTo(null); }} />
                            <button onClick={() => setAddingTo(null)} className="text-[9px] text-muted-foreground">Esc</button>
                          </div>
                        ) : (
                          <button onClick={() => { setAddingTo(section.id); setNewNoteText(''); }}
                            className="w-full text-left px-2 py-1 text-[9px] text-muted-foreground hover:text-foreground rounded transition-colors">
                            <Plus className="h-2.5 w-2.5 inline mr-0.5" /> Add note
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* AI Copilot sidebar */}
            <div className="w-[280px] border-l border-border flex flex-col shrink-0 bg-card">
              <div className="px-3 py-2.5 bg-[#0B1120] text-white flex items-center gap-2 shrink-0">
                <Sparkles className="h-3 w-3 text-[#0FB5AD]" />
                <span className="text-[10px] font-semibold">Copilot</span>
                <span className="text-[8px] text-white/40 ml-auto">{totalNotes}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {chatMessages.length === 0 && (
                  <div className="space-y-1.5 py-2">
                    <p className="text-[9px] text-muted-foreground text-center">Describe observations or ask for help</p>
                    {['Summarize all notes into themes', 'What patterns do you see?', 'Suggest dimensions from notes', `Key risks for ${workshop.customerName}?`].map((q, i) => (
                      <button key={i} onClick={() => setChatInput(q)} className="w-full text-left px-2 py-1.5 rounded-lg bg-secondary/30 text-[9px] text-foreground hover:bg-secondary/50">{q}</button>
                    ))}
                  </div>
                )}
                {chatMessages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[90%] px-2.5 py-1.5 rounded-xl text-[10px] leading-relaxed ${m.role === 'user' ? 'bg-[#f59e0b] text-white rounded-tr-sm' : 'bg-secondary/50 text-foreground rounded-tl-sm'}`}>{m.text}</div>
                  </div>
                ))}
                {chatThinking && <div className="flex justify-start"><div className="px-2.5 py-1.5 rounded-xl bg-secondary/50 text-[9px] text-muted-foreground flex items-center gap-1"><Loader2 className="h-2.5 w-2.5 animate-spin text-[#f59e0b]" /> Thinking...</div></div>}
                <div ref={chatEndRef} />
              </div>
              <div className="px-2 py-2 border-t border-border shrink-0 flex gap-1">
                <label className="p-1.5 rounded border border-border text-muted-foreground hover:text-foreground cursor-pointer shrink-0">
                  <Upload className="h-3 w-3" />
                  <input type="file" className="hidden" accept={UPLOAD_ACCEPT} onChange={e => { const f = e.target.files?.[0]; if (f) { if (f.type.startsWith('image/')) handleImageOCR(f, sections[0]?.id || ''); else handleFileUpload(e.target.files, sections[0]?.id || ''); } e.target.value = ''; }} />
                </label>
                <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleChat()}
                  placeholder="Ask or describe..."
                  className="flex-1 px-2 py-1 text-[9px] bg-secondary/30 border border-border rounded text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#f59e0b]/40" />
                <button onClick={handleChat} disabled={!chatInput.trim() || chatThinking}
                  className="p-1.5 rounded bg-[#f59e0b] text-white disabled:opacity-40"><Send className="h-3 w-3" /></button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
