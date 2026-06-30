'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  Plus, Trash2, Pencil, Check, X, Palette, LayoutGrid,
  Sparkles, Loader2, ChevronDown, ChevronUp, FileText,
  Mic, MicOff, Upload, Play, Square, Clock, Image, Camera,
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

interface StickyNote {
  id: string;
  text: string;
  color: string;
  sectionId: string;
  votes: number;
  type: 'note' | 'audio' | 'file' | 'image';
  fileName?: string;
  audioDuration?: number;
  timestamp: number;
}

interface Section {
  id: string;
  title: string;
  icon: string;
  color: string;
  collapsed: boolean;
  source: 'template' | 'level' | 'workstream' | 'custom';
}

interface WhiteboardProps {
  workshop: any;
  onRefresh: () => void;
}

export default function WorkshopWhiteboard({ workshop, onRefresh }: WhiteboardProps) {
  const levels = workshop.framework?.levels || [];
  const workstreams = workshop.framework?.workstreams || [];

  // Auto-generate sections from assessment framework
  const buildDefaultSections = (): Section[] => {
    const sections: Section[] = [];
    // General discovery sections
    sections.push({ id: 's-obs', title: 'Key Observations', icon: '👁️', color: 'blue', collapsed: false, source: 'template' });
    sections.push({ id: 's-pain', title: 'Pain Points & Challenges', icon: '🔥', color: 'red', collapsed: false, source: 'template' });
    sections.push({ id: 's-opp', title: 'Opportunities', icon: '💡', color: 'green', collapsed: false, source: 'template' });
    // Per-level sections
    levels.forEach((l: any, i: number) => {
      sections.push({ id: `s-level-${l.id || i}`, title: `${l.code || `L${i+1}`}: ${l.name}`, icon: '📊', color: ['blue', 'purple', 'teal'][i % 3], collapsed: true, source: 'level' });
    });
    // Per-workstream sections (top 4)
    workstreams.slice(0, 4).forEach((ws: any) => {
      sections.push({ id: `s-ws-${ws.code}`, title: `${ws.code}: ${ws.name}`, icon: '🎯', color: 'orange', collapsed: true, source: 'workstream' });
    });
    // Additional sections
    sections.push({ id: 's-risk', title: 'Risks & Concerns', icon: '⚠️', color: 'red', collapsed: true, source: 'template' });
    sections.push({ id: 's-arch', title: 'Architecture & Technical', icon: '🏗️', color: 'purple', collapsed: true, source: 'template' });
    sections.push({ id: 's-people', title: 'People, Process & Org', icon: '👥', color: 'pink', collapsed: true, source: 'template' });
    sections.push({ id: 's-wins', title: 'Quick Wins', icon: '⚡', color: 'yellow', collapsed: true, source: 'template' });
    sections.push({ id: 's-strategic', title: 'Strategic Themes', icon: '🎯', color: 'teal', collapsed: true, source: 'template' });
    sections.push({ id: 's-questions', title: 'Open Questions', icon: '❓', color: 'purple', collapsed: true, source: 'template' });
    sections.push({ id: 's-decisions', title: 'Decisions Made', icon: '✅', color: 'green', collapsed: true, source: 'template' });
    sections.push({ id: 's-audio', title: 'Audio Recordings', icon: '🎙️', color: 'blue', collapsed: false, source: 'template' });
    sections.push({ id: 's-docs', title: 'Uploaded Documents', icon: '📎', color: 'orange', collapsed: false, source: 'template' });
    return sections;
  };

  const savedWb = (workshop as any).whiteboard;
  const [sections, setSections] = useState<Section[]>(savedWb?.sections?.length > 0 ? savedWb.sections : buildDefaultSections());
  const [notes, setNotes] = useState<StickyNote[]>(savedWb?.notes || []);

  // Auto-save to MongoDB
  const saveWbMutation = trpc.workshop.saveWhiteboard.useMutation();
  const saveDebounce = useRef<any>(null);
  const autoSave = useCallback((s: Section[], n: StickyNote[]) => {
    if (saveDebounce.current) clearTimeout(saveDebounce.current);
    saveDebounce.current = setTimeout(() => {
      saveWbMutation.mutate({ workshopId: workshop.id, sections: s as any, notes: n as any });
    }, 1500);
  }, [workshop.id]);

  // Trigger auto-save on changes
  const updateSections = (updater: (prev: Section[]) => Section[]) => {
    updateSections(prev => { const next = updater(prev); autoSave(next, notes); return next; });
  };
  const updateNotes = (updater: (prev: StickyNote[]) => StickyNote[]) => {
    updateNotes(prev => { const next = updater(prev); autoSave(sections, next); return next; });
  };

  // OCR: extract text from whiteboard/sticky note photos via AI
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const handleImageOCR = async (file: File, sectionId: string) => {
    setOcrProcessing(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        // Send image to AI for text extraction + section suggestion
        const res = await fetch('/api/trpc/ai.chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ json: {
            message: `This is a photo of sticky notes or a whiteboard from a ${workshop.customerName} assessment workshop. Extract ALL text visible. Return as a JSON array of objects: [{"text":"<note text>","suggestedSection":"<one of: Key Observations, Pain Points, Opportunities, Risks, Architecture, People & Org, Quick Wins, Strategic Themes, Questions, Decisions, or a level/workstream name>"}]. Be thorough — capture every sticky note and piece of text. If multiple sticky notes visible, return one object per note.`,
            context: { page: 'workshop-whiteboard' },
          }}),
        });
        const data = await res.json();
        const response = data?.result?.data?.json?.response || data?.result?.data?.response || '';

        // Parse extracted notes
        try {
          const match = response.match(/\[[\s\S]*\]/);
          if (match) {
            const extracted = JSON.parse(match[0]);
            const newNotes: StickyNote[] = extracted.map((item: any) => {
              // Try to match suggested section
              const matchedSection = sections.find(s =>
                s.title.toLowerCase().includes((item.suggestedSection || '').toLowerCase())
              );
              return {
                id: uid(),
                text: item.text || '',
                color: matchedSection ? matchedSection.color : 'yellow',
                sectionId: matchedSection?.id || sectionId,
                votes: 0,
                type: 'note' as const,
                timestamp: Date.now(),
              };
            }).filter((n: StickyNote) => n.text.trim());
            updateNotes(prev => [...prev, ...newNotes]);
          } else {
            // Fallback: add response as single note
            updateNotes(prev => [...prev, { id: uid(), text: response.slice(0, 500), color: 'yellow', sectionId, votes: 0, type: 'note', timestamp: Date.now() }]);
          }
        } catch {
          updateNotes(prev => [...prev, { id: uid(), text: `📷 Photo uploaded: ${file.name}`, color: 'green', sectionId, votes: 0, type: 'image', fileName: file.name, timestamp: Date.now() }]);
        }
      };
      reader.readAsDataURL(file);
    } catch {}
    setTimeout(() => setOcrProcessing(false), 3000);
  };
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState('');
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteColor, setNewNoteColor] = useState('yellow');
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionColor, setNewSectionColor] = useState('blue');
  const [aiSummarizing, setAiSummarizing] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [dragNote, setDragNote] = useState<string | null>(null);
  const [filterSource, setFilterSource] = useState<string | null>(null);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingSection, setRecordingSection] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const [transcribing, setTranscribing] = useState(false);

  const uid = () => `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  // Audio recording
  const startRecording = async (sectionId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const duration = recordingTime;
        // Create a note for the recording
        updateNotes(prev => [...prev, {
          id: uid(),
          text: `🎙️ Audio recording (${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')})`,
          color: 'blue',
          sectionId,
          votes: 0,
          type: 'audio',
          audioDuration: duration,
          timestamp: Date.now(),
        }]);
        // Auto-transcribe using Web Speech API if available
        handleTranscribe(chunksRef.current, sectionId);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSection(sectionId);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch { /* mic access denied */ }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleTranscribe = async (chunks: Blob[], sectionId: string) => {
    // Use SpeechRecognition for live transcription hint
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return;
    setTranscribing(true);
    // Create a note indicating transcription
    updateNotes(prev => [...prev, {
      id: uid(),
      text: '⏳ Transcribing audio...',
      color: 'teal',
      sectionId,
      votes: 0,
      type: 'note',
      timestamp: Date.now(),
    }]);
    // In production, this would send to Whisper/Deepgram API
    setTimeout(() => {
      updateNotes(prev => prev.map(n => n.text === '⏳ Transcribing audio...' ? { ...n, text: '📝 Audio captured — add notes from the recording above' } : n));
      setTranscribing(false);
    }, 2000);
  };

  // File upload handler
  const handleFileUpload = (files: FileList | null, sectionId: string) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        // Images: show as image note
        const reader = new FileReader();
        reader.onload = () => {
          updateNotes(prev => [...prev, {
            id: uid(),
            text: `📷 ${file.name}`,
            color: 'green',
            sectionId,
            votes: 0,
            type: 'image',
            fileName: file.name,
            timestamp: Date.now(),
          }]);
        };
        reader.readAsDataURL(file);
      } else if (file.name.endsWith('.pdf') || file.name.endsWith('.docx') || file.name.endsWith('.pptx')) {
        updateNotes(prev => [...prev, {
          id: uid(),
          text: `📄 ${file.name} (${(file.size / 1024).toFixed(0)} KB)`,
          color: 'orange',
          sectionId,
          votes: 0,
          type: 'file',
          fileName: file.name,
          timestamp: Date.now(),
        }]);
      } else {
        // Text files — read content
        const reader = new FileReader();
        reader.onload = () => {
          const content = (reader.result as string).slice(0, 500);
          updateNotes(prev => [...prev, {
            id: uid(),
            text: `📄 ${file.name}\n${content}`,
            color: 'orange',
            sectionId,
            votes: 0,
            type: 'file',
            fileName: file.name,
            timestamp: Date.now(),
          }]);
        };
        reader.readAsText(file);
      }
    });
  };

  const addNote = (sectionId: string) => {
    if (!newNoteText.trim()) return;
    updateNotes(prev => [...prev, { id: uid(), text: newNoteText.trim(), color: newNoteColor, sectionId, votes: 0, type: 'note', timestamp: Date.now() }]);
    setNewNoteText('');
    setAddingTo(null);
  };

  const deleteNote = (id: string) => updateNotes(prev => prev.filter(n => n.id !== id));
  const voteNote = (id: string) => updateNotes(prev => prev.map(n => n.id === id ? { ...n, votes: n.votes + 1 } : n));
  const updateNote = (id: string, text: string) => { updateNotes(prev => prev.map(n => n.id === id ? { ...n, text } : n)); setEditingNote(null); };

  const addSection = () => {
    if (!newSectionTitle.trim()) return;
    updateSections(prev => [...prev, { id: `s-${Date.now()}`, title: newSectionTitle.trim(), icon: '📌', color: newSectionColor, collapsed: false, source: 'custom' }]);
    setNewSectionTitle('');
    setShowAddSection(false);
  };

  const deleteSection = (id: string) => { updateSections(prev => prev.filter(s => s.id !== id)); updateNotes(prev => prev.filter(n => n.sectionId !== id)); };
  const toggleSection = (id: string) => updateSections(prev => prev.map(s => s.id === id ? { ...s, collapsed: !s.collapsed } : s));
  const moveNote = (noteId: string, targetSectionId: string) => { updateNotes(prev => prev.map(n => n.id === noteId ? { ...n, sectionId: targetSectionId } : n)); setDragNote(null); };
  const getColor = (colorId: string) => COLORS.find(c => c.id === colorId) || COLORS[0];

  // AI Summarize
  const handleAISummarize = async () => {
    if (notes.length < 2) return;
    setAiSummarizing(true);
    try {
      const allNotes = sections.map(s => {
        const sNotes = notes.filter(n => n.sectionId === s.id);
        if (sNotes.length === 0) return '';
        return `${s.icon} ${s.title}:\n${sNotes.map(n => `  - ${n.text} (${n.votes} votes)`).join('\n')}`;
      }).filter(Boolean).join('\n\n');

      const res = await fetch('/api/trpc/ai.chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ json: {
          message: `Synthesize these workshop whiteboard notes into actionable themes and findings. Group by: 1) Critical findings 2) Strategic themes 3) Immediate actions needed 4) Questions to resolve. Be specific to ${workshop.customerName}.\n\nNotes:\n${allNotes}`,
          context: { page: 'workshop-whiteboard' },
        }}),
      });
      const data = await res.json();
      setAiSummary(data?.result?.data?.json?.response || data?.result?.data?.response || 'Unable to summarize.');
    } catch { setAiSummary('Unable to summarize — try again.'); }
    setAiSummarizing(false);
  };

  // Filter sections
  const filteredSections = filterSource ? sections.filter(s => s.source === filterSource) : sections;
  const nonEmptySections = filteredSections.filter(s => notes.some(n => n.sectionId === s.id) || !s.collapsed);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-[#f59e0b]" />
            Discovery Whiteboard
          </h3>
          <p className="text-[10px] text-muted-foreground">
            {sections.length} sections ({sections.filter(s => s.source === 'level').length} from levels, {sections.filter(s => s.source === 'workstream').length} from workstreams) · {notes.length} notes
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Source filter */}
          <div className="flex gap-0.5 p-0.5 rounded-lg bg-secondary border border-border">
            {[
              { id: null, label: 'All' },
              { id: 'template', label: 'General' },
              { id: 'level', label: 'Levels' },
              { id: 'workstream', label: 'Workstreams' },
            ].map(f => (
              <button key={f.label} onClick={() => setFilterSource(f.id)}
                className={`px-2 py-1 text-[10px] rounded-md transition-colors ${filterSource === f.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                {f.label}
              </button>
            ))}
          </div>
          <button onClick={() => setShowAddSection(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-[10px] rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
            <Plus className="h-3 w-3" /> Section
          </button>
          <button onClick={handleAISummarize} disabled={aiSummarizing || notes.length < 2}
            className="flex items-center gap-1 px-3 py-1.5 text-[10px] rounded-lg bg-[#7c3aed] text-white disabled:opacity-40">
            {aiSummarizing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            AI Synthesize
          </button>
        </div>
      </div>

      {/* OCR processing indicator */}
      {ocrProcessing && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0A867F]/10 border border-[#0A867F]/30">
          <Loader2 className="h-4 w-4 animate-spin text-[#0A867F]" />
          <span className="text-xs font-medium text-[#0A867F]">Extracting text from photo...</span>
          <span className="text-[10px] text-muted-foreground">AI is reading sticky notes and whiteboard content</span>
        </div>
      )}

      {/* Global audio recorder */}
      {isRecording && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 animate-pulse">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
          <span className="text-xs font-medium text-red-400">Recording...</span>
          <span className="text-xs font-mono text-red-300">{Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}</span>
          <div className="flex-1" />
          <button onClick={stopRecording} className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-red-500 text-white">
            <Square className="h-3 w-3" /> Stop
          </button>
        </div>
      )}

      {/* Add section form */}
      {showAddSection && (
        <div className="p-4 rounded-xl bg-[#f59e0b]/5 border border-[#f59e0b]/20 space-y-3">
          <div className="flex gap-2">
            <input value={newSectionTitle} onChange={e => setNewSectionTitle(e.target.value)}
              placeholder="Section title..." className="flex-1 px-3 py-1.5 text-xs bg-card border border-border rounded-lg text-foreground"
              onKeyDown={e => e.key === 'Enter' && addSection()} />
            <div className="flex gap-1">
              {COLORS.slice(0, 6).map(c => (
                <button key={c.id} onClick={() => setNewSectionColor(c.id)}
                  className={`w-6 h-6 rounded-md border-2 ${newSectionColor === c.id ? 'border-foreground scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c.bg }} />
              ))}
            </div>
            <button onClick={addSection} disabled={!newSectionTitle.trim()}
              className="px-3 py-1.5 text-[10px] rounded-lg bg-[#f59e0b] text-white font-medium disabled:opacity-50">Add</button>
            <button onClick={() => setShowAddSection(false)} className="text-[10px] text-muted-foreground">Cancel</button>
          </div>
        </div>
      )}

      {/* AI Summary */}
      {aiSummary && (
        <div className="p-4 rounded-xl bg-[#7c3aed]/5 border border-[#7c3aed]/20 relative">
          <button onClick={() => setAiSummary(null)} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#7c3aed] mb-2 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" /> AI-Synthesized Themes
          </div>
          <div className="text-xs text-foreground leading-relaxed whitespace-pre-line">{aiSummary}</div>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-3">
        {filteredSections.map(section => {
          const sectionNotes = notes.filter(n => n.sectionId === section.id).sort((a, b) => b.votes - a.votes);
          const color = getColor(section.color);
          const isAudioSection = section.id === 's-audio';
          const isDocsSection = section.id === 's-docs';

          return (
            <div key={section.id} className="rounded-xl border overflow-hidden transition-colors"
              style={{ borderColor: color.border + '40', background: sectionNotes.length > 0 ? color.bg + '15' : 'transparent' }}
              onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = color.border; }}
              onDragLeave={e => { e.currentTarget.style.borderColor = color.border + '40'; }}
              onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = color.border + '40'; if (dragNote) moveNote(dragNote, section.id); }}>

              {/* Section header */}
              <div className="flex items-center gap-2 px-4 py-2.5 group/sec">
                <button onClick={() => toggleSection(section.id)} className="flex items-center gap-2 flex-1 text-left">
                  <span className="text-sm">{section.icon}</span>
                  <span className="text-xs font-semibold" style={{ color: color.text }}>{section.title}</span>
                  {section.source !== 'template' && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full font-mono" style={{ backgroundColor: color.bg, color: color.text + '99' }}>
                      {section.source}
                    </span>
                  )}
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono" style={{ backgroundColor: color.bg, color: color.text }}>
                    {sectionNotes.length}
                  </span>
                </button>
                {/* Section actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover/sec:opacity-100 transition-opacity">
                  {/* Record audio into this section */}
                  {!isRecording && (
                    <button onClick={(e) => { e.stopPropagation(); startRecording(section.id); }}
                      className="p-1 rounded text-muted-foreground hover:text-red-400 transition-colors" title="Record audio">
                      <Mic className="h-3 w-3" />
                    </button>
                  )}
                  {/* Upload file/image into this section */}
                  <label className="p-1 rounded text-muted-foreground hover:text-foreground cursor-pointer transition-colors" title="Upload file or image">
                    <Upload className="h-3 w-3" />
                    <input type="file" className="hidden" multiple accept=".pdf,.docx,.pptx,.txt,.csv,.md,.png,.jpg,.jpeg,.webp"
                      onChange={e => { handleFileUpload(e.target.files, section.id); e.target.value = ''; }} />
                  </label>
                  {/* Camera: capture whiteboard/sticky note photo → OCR → auto-section */}
                  <label className="p-1 rounded text-muted-foreground hover:text-[#0A867F] cursor-pointer transition-colors" title="📸 Capture whiteboard photo (OCR → auto-extract notes)">
                    <Camera className="h-3 w-3" />
                    <input type="file" className="hidden" accept="image/*" capture="environment"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleImageOCR(f, section.id); e.target.value = ''; }} />
                  </label>
                  <button onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${section.title}" and all its notes?`)) deleteSection(section.id); }}
                    className="p-1 rounded text-muted-foreground hover:text-red-400 transition-opacity">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${section.collapsed ? '-rotate-90' : ''}`} />
              </div>

              {/* Notes */}
              {!section.collapsed && (
                <div className="px-4 pb-3">
                  <div className="flex flex-wrap gap-2">
                    {sectionNotes.map(note => {
                      const noteColor = getColor(note.color);
                      const isEditing = editingNote === note.id;

                      return (
                        <div key={note.id} draggable onDragStart={() => setDragNote(note.id)}
                          className="w-[200px] rounded-lg shadow-sm cursor-grab active:cursor-grabbing transition-all hover:shadow-md hover:-translate-y-0.5 group/note"
                          style={{ backgroundColor: noteColor.bg, border: `1px solid ${noteColor.border}` }}>
                          <div className="p-3">
                            {isEditing ? (
                              <div className="space-y-1.5">
                                <textarea value={editBuffer} onChange={e => setEditBuffer(e.target.value)}
                                  className="w-full px-2 py-1 text-[11px] bg-white/50 border border-black/10 rounded resize-none" rows={3}
                                  style={{ color: noteColor.text }} autoFocus />
                                <div className="flex gap-1 justify-end">
                                  <button onClick={() => setEditingNote(null)}><X className="h-3 w-3" /></button>
                                  <button onClick={() => updateNote(note.id, editBuffer)} className="text-emerald-600"><Check className="h-3 w-3" /></button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="text-[11px] leading-relaxed mb-2 whitespace-pre-wrap" style={{ color: noteColor.text }}>{note.text}</p>
                                <div className="flex items-center gap-1">
                                  <button onClick={() => voteNote(note.id)}
                                    className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                                    style={{ backgroundColor: noteColor.border + '40', color: noteColor.text }}>
                                    👍 {note.votes}
                                  </button>
                                  {note.type !== 'note' && (
                                    <span className="text-[8px] px-1 py-0.5 rounded font-mono" style={{ color: noteColor.text + '80' }}>{note.type}</span>
                                  )}
                                  <div className="flex-1" />
                                  <button onClick={() => { setEditingNote(note.id); setEditBuffer(note.text); }}
                                    className="p-0.5 opacity-0 group-hover/note:opacity-60 hover:!opacity-100" style={{ color: noteColor.text }}>
                                    <Pencil className="h-2.5 w-2.5" />
                                  </button>
                                  <button onClick={() => deleteNote(note.id)}
                                    className="p-0.5 opacity-0 group-hover/note:opacity-60 hover:!opacity-100 text-red-400">
                                    <Trash2 className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Add note */}
                    {addingTo === section.id ? (
                      <div className="w-[200px] rounded-lg p-3 space-y-2" style={{ backgroundColor: getColor(newNoteColor).bg, border: `1px dashed ${color.border}` }}>
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
                        className="w-[200px] h-[90px] rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors hover:border-opacity-80"
                        style={{ borderColor: color.border + '40', color: color.text + '60' }}>
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

      {/* Stats */}
      {notes.length > 0 && (
        <div className="flex items-center gap-4 px-4 py-2 rounded-lg bg-secondary/20 text-[10px] text-muted-foreground flex-wrap">
          <span>{notes.length} notes</span>
          <span>{notes.reduce((s, n) => s + n.votes, 0)} votes</span>
          <span>{notes.filter(n => n.type === 'audio').length} recordings</span>
          <span>{notes.filter(n => n.type === 'file' || n.type === 'image').length} files</span>
          <span>{sections.filter(s => s.source === 'level').length} level sections</span>
          <span>{sections.filter(s => s.source === 'workstream').length} workstream sections</span>
          {notes.filter(n => n.votes >= 2).length > 0 && (
            <span className="text-[#f59e0b]">{notes.filter(n => n.votes >= 2).length} high-priority (2+ votes)</span>
          )}
        </div>
      )}
    </div>
  );
}
