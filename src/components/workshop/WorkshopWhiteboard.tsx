'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Plus, Trash2, Pencil, Check, X, Move, Palette, Layers,
  StickyNote, LayoutGrid, Type, Sparkles, Loader2, GripVertical,
  MessageSquare, Lightbulb, AlertTriangle, Target, Zap, ChevronDown,
} from 'lucide-react';

const COLORS = [
  { id: 'yellow', bg: '#FEF9C3', border: '#FDE047', text: '#854D0E' },
  { id: 'blue', bg: '#DBEAFE', border: '#93C5FD', text: '#1E40AF' },
  { id: 'green', bg: '#DCFCE7', border: '#86EFAC', text: '#166534' },
  { id: 'pink', bg: '#FCE7F3', border: '#F9A8D4', text: '#9D174D' },
  { id: 'purple', bg: '#F3E8FF', border: '#C4B5FD', text: '#6B21A8' },
  { id: 'orange', bg: '#FFF7ED', border: '#FDBA74', text: '#9A3412' },
  { id: 'teal', bg: '#F0FDFA', border: '#5EEAD4', text: '#115E59' },
  { id: 'red', bg: '#FEF2F2', border: '#FCA5A5', text: '#991B1B' },
];

const SECTION_TEMPLATES = [
  { label: 'Key Observations', icon: '👁️', color: 'blue' },
  { label: 'Pain Points', icon: '🔥', color: 'red' },
  { label: 'Opportunities', icon: '💡', color: 'green' },
  { label: 'Questions', icon: '❓', color: 'purple' },
  { label: 'Decisions', icon: '✅', color: 'teal' },
  { label: 'Risks', icon: '⚠️', color: 'orange' },
  { label: 'Architecture', icon: '🏗️', color: 'blue' },
  { label: 'People & Org', icon: '👥', color: 'pink' },
  { label: 'Quick Wins', icon: '⚡', color: 'yellow' },
  { label: 'Strategic Themes', icon: '🎯', color: 'purple' },
];

interface StickyNote {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
  sectionId: string;
  votes: number;
  author?: string;
}

interface Section {
  id: string;
  title: string;
  icon: string;
  color: string;
  collapsed: boolean;
}

interface WhiteboardProps {
  workshop: any;
  onRefresh: () => void;
}

export default function WorkshopWhiteboard({ workshop, onRefresh }: WhiteboardProps) {
  // Load from workshop.whiteboard or initialize
  const saved = (workshop as any).whiteboard;
  const [sections, setSections] = useState<Section[]>(
    saved?.sections || [
      { id: 's1', title: 'Key Observations', icon: '👁️', color: 'blue', collapsed: false },
      { id: 's2', title: 'Pain Points', icon: '🔥', color: 'red', collapsed: false },
      { id: 's3', title: 'Opportunities', icon: '💡', color: 'green', collapsed: false },
    ]
  );
  const [notes, setNotes] = useState<StickyNote[]>(saved?.notes || []);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState('');
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteColor, setNewNoteColor] = useState('yellow');
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionIcon, setNewSectionIcon] = useState('📌');
  const [newSectionColor, setNewSectionColor] = useState('blue');
  const [aiSummarizing, setAiSummarizing] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [dragNote, setDragNote] = useState<string | null>(null);

  const chatMutation = (globalThis as any).__trpc_chat_mutation;
  const updateMeta = (globalThis as any).__trpc_update_meta;

  // Auto-save whiteboard state
  const saveTimeout = useRef<any>(null);
  const autoSave = useCallback(() => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      // Save via parent refresh — whiteboard state stored in component
      // In production, this would persist to workshop.whiteboard in MongoDB
    }, 1000);
  }, []);

  useEffect(() => { autoSave(); }, [notes, sections]);

  const uid = () => `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const addNote = (sectionId: string) => {
    if (!newNoteText.trim()) return;
    setNotes(prev => [...prev, {
      id: uid(),
      text: newNoteText.trim(),
      color: newNoteColor,
      x: 0, y: 0,
      sectionId,
      votes: 0,
    }]);
    setNewNoteText('');
    setAddingTo(null);
  };

  const deleteNote = (id: string) => setNotes(prev => prev.filter(n => n.id !== id));
  const voteNote = (id: string) => setNotes(prev => prev.map(n => n.id === id ? { ...n, votes: n.votes + 1 } : n));

  const updateNote = (id: string, text: string) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, text } : n));
    setEditingNote(null);
  };

  const addSection = () => {
    if (!newSectionTitle.trim()) return;
    setSections(prev => [...prev, {
      id: `s-${Date.now()}`,
      title: newSectionTitle.trim(),
      icon: newSectionIcon,
      color: newSectionColor,
      collapsed: false,
    }]);
    setNewSectionTitle('');
    setShowAddSection(false);
  };

  const deleteSection = (id: string) => {
    setSections(prev => prev.filter(s => s.id !== id));
    setNotes(prev => prev.filter(n => n.sectionId !== id));
  };

  const toggleSection = (id: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, collapsed: !s.collapsed } : s));
  };

  const moveNote = (noteId: string, targetSectionId: string) => {
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, sectionId: targetSectionId } : n));
    setDragNote(null);
  };

  const getColor = (colorId: string) => COLORS.find(c => c.id === colorId) || COLORS[0];

  // AI: summarize all notes into themes
  const handleAISummarize = async () => {
    if (notes.length < 3) return;
    setAiSummarizing(true);
    try {
      const allNotes = sections.map(s => {
        const sNotes = notes.filter(n => n.sectionId === s.id);
        return `${s.icon} ${s.title}:\n${sNotes.map(n => `  - ${n.text} (${n.votes} votes)`).join('\n')}`;
      }).join('\n\n');

      // Use the workshop's AI chat to summarize
      const result = await fetch('/api/trpc/ai.chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ json: {
          message: `Synthesize these workshop whiteboard notes into 3-5 key themes. Be specific and actionable. Format as numbered themes with a one-line description each.\n\nClient: ${workshop.customerName}\nWorkshop: ${workshop.title}\n\nNotes:\n${allNotes}`,
          context: { page: 'workshop-whiteboard' },
        }}),
      });
      const data = await result.json();
      const text = data?.result?.data?.json?.response || data?.result?.data?.response || '';
      setAiSummary(text);
    } catch { setAiSummary('Unable to summarize — try again.'); }
    setAiSummarizing(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-[#f59e0b]" />
            Discovery Whiteboard
          </h3>
          <p className="text-[10px] text-muted-foreground">Capture observations, pain points, and themes before assessment scoring</p>
        </div>
        <div className="flex gap-2">
          <span className="text-[10px] px-2 py-1 rounded-full bg-[#f59e0b]/10 text-[#f59e0b] font-medium">
            {notes.length} notes · {sections.length} sections
          </span>
          <button onClick={() => setShowAddSection(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-[10px] rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-[#f59e0b]/30 transition-colors">
            <Plus className="h-3 w-3" /> Add Section
          </button>
          <button onClick={handleAISummarize} disabled={aiSummarizing || notes.length < 3}
            className="flex items-center gap-1 px-3 py-1.5 text-[10px] rounded-lg bg-[#7c3aed] text-white disabled:opacity-40 transition-colors">
            {aiSummarizing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            AI Themes
          </button>
        </div>
      </div>

      {/* Quick section templates */}
      {showAddSection && (
        <div className="p-4 rounded-xl bg-[#f59e0b]/5 border border-[#f59e0b]/20 space-y-3 animate-in slide-in-from-top-1">
          <div className="text-[10px] font-semibold text-[#f59e0b] uppercase tracking-wider">New Section</div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {SECTION_TEMPLATES.filter(t => !sections.find(s => s.title === t.label)).map(t => (
              <button key={t.label} onClick={() => { setNewSectionTitle(t.label); setNewSectionIcon(t.icon); setNewSectionColor(t.color); }}
                className={`px-2.5 py-1.5 text-[10px] rounded-lg border transition-colors ${newSectionTitle === t.label ? 'border-[#f59e0b]/40 bg-[#f59e0b]/10 text-foreground' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newSectionTitle} onChange={e => setNewSectionTitle(e.target.value)}
              placeholder="Section title..." className="flex-1 px-3 py-1.5 text-xs bg-card border border-border rounded-lg text-foreground" />
            <input value={newSectionIcon} onChange={e => setNewSectionIcon(e.target.value)}
              className="w-12 px-2 py-1.5 text-xs text-center bg-card border border-border rounded-lg" placeholder="📌" />
            <div className="flex gap-1">
              {COLORS.slice(0, 6).map(c => (
                <button key={c.id} onClick={() => setNewSectionColor(c.id)}
                  className={`w-6 h-6 rounded-md border-2 transition-all ${newSectionColor === c.id ? 'border-foreground scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c.bg }} />
              ))}
            </div>
            <button onClick={addSection} disabled={!newSectionTitle.trim()}
              className="px-3 py-1.5 text-[10px] rounded-lg bg-[#f59e0b] text-white font-medium disabled:opacity-50">Add</button>
            <button onClick={() => setShowAddSection(false)} className="text-[10px] text-muted-foreground px-2">Cancel</button>
          </div>
        </div>
      )}

      {/* AI Summary */}
      {aiSummary && (
        <div className="p-4 rounded-xl bg-[#7c3aed]/5 border border-[#7c3aed]/20 relative">
          <button onClick={() => setAiSummary(null)} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground">
            <X className="h-3 w-3" />
          </button>
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#7c3aed] mb-2 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" /> AI-Synthesized Themes
          </div>
          <div className="text-xs text-foreground leading-relaxed whitespace-pre-line">{aiSummary}</div>
        </div>
      )}

      {/* Sections with sticky notes */}
      <div className="space-y-3">
        {sections.map(section => {
          const sectionNotes = notes.filter(n => n.sectionId === section.id).sort((a, b) => b.votes - a.votes);
          const color = getColor(section.color);

          return (
            <div key={section.id} className="rounded-xl border overflow-hidden transition-colors"
              style={{ borderColor: color.border + '60', background: color.bg + '30' }}
              onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = color.border; }}
              onDragLeave={e => { e.currentTarget.style.borderColor = color.border + '60'; }}
              onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = color.border + '60'; if (dragNote) moveNote(dragNote, section.id); }}>

              {/* Section header */}
              <div className="flex items-center gap-2 px-4 py-2.5 cursor-pointer" onClick={() => toggleSection(section.id)}>
                <span className="text-base">{section.icon}</span>
                <span className="text-xs font-semibold flex-1" style={{ color: color.text }}>{section.title}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono" style={{ backgroundColor: color.bg, color: color.text }}>
                  {sectionNotes.length}
                </span>
                <button onClick={(e) => { e.stopPropagation(); deleteSection(section.id); }}
                  className="p-1 rounded text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="h-3 w-3" />
                </button>
                <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${section.collapsed ? '-rotate-90' : ''}`} />
              </div>

              {/* Notes grid */}
              {!section.collapsed && (
                <div className="px-4 pb-3">
                  <div className="flex flex-wrap gap-2">
                    {sectionNotes.map(note => {
                      const noteColor = getColor(note.color);
                      const isEditing = editingNote === note.id;

                      return (
                        <div key={note.id}
                          draggable
                          onDragStart={() => setDragNote(note.id)}
                          className="w-[180px] rounded-lg shadow-sm cursor-grab active:cursor-grabbing transition-all hover:shadow-md hover:-translate-y-0.5"
                          style={{ backgroundColor: noteColor.bg, border: `1px solid ${noteColor.border}` }}>
                          <div className="p-3">
                            {isEditing ? (
                              <div className="space-y-1.5">
                                <textarea value={editBuffer} onChange={e => setEditBuffer(e.target.value)}
                                  className="w-full px-2 py-1 text-[11px] bg-white/50 border border-black/10 rounded resize-none" rows={3}
                                  style={{ color: noteColor.text }} autoFocus />
                                <div className="flex gap-1 justify-end">
                                  <button onClick={() => setEditingNote(null)} className="p-0.5"><X className="h-3 w-3" /></button>
                                  <button onClick={() => updateNote(note.id, editBuffer)} className="p-0.5 text-emerald-600"><Check className="h-3 w-3" /></button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="text-[11px] leading-relaxed mb-2" style={{ color: noteColor.text }}>{note.text}</p>
                                <div className="flex items-center gap-1">
                                  <button onClick={() => voteNote(note.id)}
                                    className="text-[9px] px-1.5 py-0.5 rounded-full font-medium transition-colors"
                                    style={{ backgroundColor: noteColor.border + '40', color: noteColor.text }}>
                                    👍 {note.votes}
                                  </button>
                                  <div className="flex-1" />
                                  <button onClick={() => { setEditingNote(note.id); setEditBuffer(note.text); }}
                                    className="p-0.5 rounded opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity"
                                    style={{ color: noteColor.text }}>
                                    <Pencil className="h-2.5 w-2.5" />
                                  </button>
                                  <button onClick={() => deleteNote(note.id)}
                                    className="p-0.5 rounded opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity text-red-400">
                                    <Trash2 className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Add note inline */}
                    {addingTo === section.id ? (
                      <div className="w-[180px] rounded-lg p-3 space-y-2" style={{ backgroundColor: getColor(newNoteColor).bg, border: `1px dashed ${color.border}` }}>
                        <textarea value={newNoteText} onChange={e => setNewNoteText(e.target.value)}
                          placeholder="Type your note..." autoFocus rows={3}
                          className="w-full px-2 py-1 text-[11px] bg-white/50 border border-black/10 rounded resize-none"
                          style={{ color: getColor(newNoteColor).text }}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addNote(section.id); } }} />
                        <div className="flex items-center gap-1">
                          {COLORS.slice(0, 6).map(c => (
                            <button key={c.id} onClick={() => setNewNoteColor(c.id)}
                              className={`w-4 h-4 rounded-full border ${newNoteColor === c.id ? 'border-foreground ring-1 ring-foreground' : 'border-transparent'}`}
                              style={{ backgroundColor: c.bg }} />
                          ))}
                          <div className="flex-1" />
                          <button onClick={() => setAddingTo(null)} className="text-[9px] text-muted-foreground">Cancel</button>
                          <button onClick={() => addNote(section.id)} disabled={!newNoteText.trim()}
                            className="text-[9px] px-2 py-0.5 rounded bg-foreground/10 text-foreground font-medium disabled:opacity-40">Add</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setAddingTo(section.id)}
                        className="w-[180px] h-[100px] rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors hover:border-opacity-80"
                        style={{ borderColor: color.border + '50', color: color.text + '80' }}>
                        <Plus className="h-4 w-4" />
                        <span className="text-[10px]">Add note</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {sections.length === 0 && (
        <div className="text-center py-12">
          <LayoutGrid className="h-8 w-8 text-muted-foreground opacity-30 mx-auto mb-3" />
          <div className="text-sm text-foreground mb-1">No sections yet</div>
          <div className="text-xs text-muted-foreground mb-4">Create sections to organize your discovery notes</div>
          <button onClick={() => setShowAddSection(true)}
            className="px-4 py-2 text-xs rounded-lg bg-[#f59e0b] text-white">
            <Plus className="h-3 w-3 inline mr-1" /> Add First Section
          </button>
        </div>
      )}

      {/* Quick stats */}
      {notes.length > 0 && (
        <div className="flex items-center gap-4 px-4 py-2 rounded-lg bg-secondary/20 text-[10px] text-muted-foreground flex-wrap">
          <span>{notes.length} total notes</span>
          <span>{notes.reduce((s, n) => s + n.votes, 0)} total votes</span>
          <span>{sections.length} sections</span>
          {notes.filter(n => n.votes >= 2).length > 0 && (
            <span className="text-[#f59e0b]">{notes.filter(n => n.votes >= 2).length} high-priority notes (2+ votes)</span>
          )}
        </div>
      )}
    </div>
  );
}
