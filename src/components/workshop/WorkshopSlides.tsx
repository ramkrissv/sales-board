'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  ChevronLeft, ChevronRight, Maximize2, Minimize2, Plus, Trash2,
  StickyNote, Mic, Square, Upload, Camera, Check, X, Sparkles,
  Loader2, FileText, Edit3, Layers, Target, Shield, MessageSquare,
  ThumbsUp, PenTool, Send,
} from 'lucide-react';

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */
interface SlideSticky {
  id: string;
  text: string;
  color: string;
  votes: number;
}

interface SlideNote {
  id: string;
  text: string;
  author?: string;
}

interface WorkshopSlide {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  content: string;
  formats: string[];
  stickies: SlideSticky[];
  notes: SlideNote[];
  canvasData: string;
  uploads: { id: string; name: string; url?: string }[];
}

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const STICKY_COLORS = [
  { bg: '#FEF3C7', border: '#F59E0B', label: 'Yellow' },
  { bg: '#DBEAFE', border: '#3B82F6', label: 'Blue' },
  { bg: '#D1FAE5', border: '#10B981', label: 'Green' },
  { bg: '#FCE7F3', border: '#EC4899', label: 'Pink' },
  { bg: '#EDE9FE', border: '#8B5CF6', label: 'Purple' },
  { bg: '#FFEDD5', border: '#F97316', label: 'Orange' },
];

const FORMAT_BADGES: Record<string, { bg: string; text: string }> = {
  WHITEBOARD: { bg: 'bg-teal-100 text-teal-800', text: 'Whiteboard' },
  STICKIES:   { bg: 'bg-amber-100 text-amber-800', text: 'Stickies' },
  DISCUSS:    { bg: 'bg-blue-100 text-blue-800', text: 'Discuss' },
  'DOC INPUT':{ bg: 'bg-purple-100 text-purple-800', text: 'Doc Input' },
  READOUT:    { bg: 'bg-green-100 text-green-800', text: 'Readout' },
  PRIORITIZE: { bg: 'bg-red-100 text-red-800', text: 'Prioritize' },
  PRESENT:    { bg: 'bg-gray-100 text-gray-700', text: 'Present' },
  ALIGN:      { bg: 'bg-emerald-100 text-emerald-800', text: 'Align' },
  SCORE:      { bg: 'bg-orange-100 text-orange-800', text: 'Score' },
};

const MATURITY_LABELS = ['Absent', 'Ad hoc', 'Repeatable', 'Governed', 'Optimized'];
const MATURITY_COLORS = ['#C3C9D4', '#9DB0C6', '#6E97C2', '#3A93A0', '#0A867F'];

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */
interface Props { workshop: any; onRefresh: () => void; }

export default function WorkshopSlides({ workshop, onRefresh }: Props) {
  // --- Load slides from saved whiteboard state ---
  const loadSlides = (): WorkshopSlide[] => {
    const wb = workshop.whiteboard;
    if (wb?.slides && Array.isArray(wb.slides) && wb.slides.length > 0) {
      return wb.slides;
    }
    return [];
  };

  const [slides, setSlides] = useState<WorkshopSlide[]>(loadSlides);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPresenterMode, setIsPresenterMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [editingText, setEditingText] = useState<string | null>(null);

  // Sticky input
  const [addingSticky, setAddingSticky] = useState(false);
  const [newStickyText, setNewStickyText] = useState('');
  const [newStickyColor, setNewStickyColor] = useState(0);

  // Note input
  const [addingNote, setAddingNote] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');

  // AI
  const [aiLoading, setAiLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');

  // Copilot
  const [copilotOpen, setCopilotOpen] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [chatThinking, setChatThinking] = useState(false);
  const copilotEndRef = useRef<HTMLDivElement>(null);

  // Refs
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const saveRef = useRef<any>(null);
  const slidesRef = useRef(slides);
  const contentEditRef = useRef<HTMLDivElement>(null);

  useEffect(() => { slidesRef.current = slides; }, [slides]);

  // Mutations
  const saveWb = trpc.workshop.saveWhiteboard.useMutation();
  const chatMutation = trpc.ai.chat.useMutation();

  // --- Persist (2s debounce) ---
  const persist = useCallback(() => {
    if (saveRef.current) clearTimeout(saveRef.current);
    setSaveStatus('saving');
    saveRef.current = setTimeout(() => {
      const wb = workshop.whiteboard || {};
      saveWb.mutate({
        workshopId: workshop.id,
        stickies: wb.stickies || [],
        sections: wb.sections || [],
        mediaItems: wb.mediaItems || [],
        canvasData: wb.canvasData || '',
        slides: slidesRef.current as any,
      }, {
        onSuccess: () => setSaveStatus('saved'),
        onError: () => setSaveStatus('idle'),
      });
    }, 2000);
  }, [workshop.id]);

  useEffect(() => { persist(); }, [slides]);

  // --- Current slide ---
  const current = slides[activeSlide] || null;

  // --- Navigation ---
  const goTo = (idx: number) => {
    if (idx >= 0 && idx < slides.length) {
      setActiveSlide(idx);
      setEditingText(null);
      setAddingSticky(false);
      setAddingNote(false);
    }
  };

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.target as HTMLElement)?.isContentEditable) return;
      if (e.key === 'ArrowLeft') goTo(activeSlide - 1);
      if (e.key === 'ArrowRight') goTo(activeSlide + 1);
      if (e.key === 'Escape' && isPresenterMode) setIsPresenterMode(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeSlide, isPresenterMode, slides.length]);

  useEffect(() => { copilotEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  // Copilot chat handler
  const handleCopilotChat = async () => {
    if (!chatInput.trim() || chatThinking) return;
    const msg = chatInput.trim(); setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: msg }]);
    setChatThinking(true);
    try {
      const slide = slides[activeSlide];
      const slideCtx = slide ? `Current slide ${slide.number}: "${slide.title}"\nContent: ${slide.content?.slice(0, 500)}\nFormats: ${slide.formats?.join(', ')}\nStickies: ${slide.stickies?.map(s => s.text).join('; ') || 'none'}\nNotes: ${slide.notes?.map(n => n.text).join('; ') || 'none'}` : 'No slide selected';
      const allSlides = slides.map(s => `Slide ${s.number}: ${s.title}`).join('\n');

      const result = await chatMutation.mutateAsync({
        message: `Workshop slide copilot for ${workshop.customerName}.\n\n${slideCtx}\n\nAll slides:\n${allSlides}\n\nUser: ${msg}\n\nHelp with the current slide. To add stickies: [STICKY: color=yellow text=...]\nTo add notes: [NOTE: text=...]\nBe concise.`,
        context: { page: 'workshop-whiteboard' },
      });
      const resp = result.response;
      // Parse stickies
      for (const m of resp.matchAll(/\[STICKY:\s*color=(\w+)\s+text=([^\]]+)\]/g)) {
        const colors: Record<string, string> = { yellow: '#FEF3C7', blue: '#DBEAFE', green: '#D1FAE5', pink: '#FCE7F3', purple: '#EDE9FE', orange: '#FFEDD5' };
        updateSlide(activeSlide, { stickies: [...(slides[activeSlide]?.stickies || []), { id: uid(), text: m[2].trim(), color: colors[m[1]] || '#FEF3C7', votes: 0 }] });
      }
      // Parse notes
      for (const m of resp.matchAll(/\[NOTE:\s*text=([^\]]+)\]/g)) {
        updateSlide(activeSlide, { notes: [...(slides[activeSlide]?.notes || []), { id: uid(), text: m[2].trim() }] });
      }
      const clean = resp.replace(/\[STICKY:[^\]]+\]/g, '').replace(/\[NOTE:[^\]]+\]/g, '').trim();
      if (clean) setChatMessages(prev => [...prev, { role: 'ai', text: clean }]);
    } catch { setChatMessages(prev => [...prev, { role: 'ai', text: 'Error. Try again.' }]); }
    setChatThinking(false);
  };

  // --- Slide mutation helpers ---
  const updateSlide = (idx: number, patch: Partial<WorkshopSlide>) => {
    setSlides(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
  };

  // --- Stickies ---
  const addSticky = () => {
    if (!newStickyText.trim() || !current) return;
    const sticky: SlideSticky = {
      id: uid(), text: newStickyText.trim(),
      color: STICKY_COLORS[newStickyColor].bg, votes: 0,
    };
    updateSlide(activeSlide, { stickies: [...current.stickies, sticky] });
    setNewStickyText('');
    setAddingSticky(false);
  };

  const deleteSticky = (stickyId: string) => {
    if (!current) return;
    updateSlide(activeSlide, { stickies: current.stickies.filter(s => s.id !== stickyId) });
  };

  const voteSticky = (stickyId: string) => {
    if (!current) return;
    updateSlide(activeSlide, {
      stickies: current.stickies.map(s => s.id === stickyId ? { ...s, votes: s.votes + 1 } : s),
    });
  };

  // --- Notes ---
  const addNote = () => {
    if (!newNoteText.trim() || !current) return;
    const note: SlideNote = { id: uid(), text: newNoteText.trim() };
    updateSlide(activeSlide, { notes: [...current.notes, note] });
    setNewNoteText('');
    setAddingNote(false);
  };

  const deleteNote = (noteId: string) => {
    if (!current) return;
    updateSlide(activeSlide, { notes: current.notes.filter(n => n.id !== noteId) });
  };

  // --- Content editing ---
  const handleContentBlur = () => {
    if (editingText !== null && current) {
      const el = contentEditRef.current;
      if (el) updateSlide(activeSlide, { content: el.innerText });
    }
    setEditingText(null);
  };

  // --- Audio recording ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const duration = `${Math.floor(recordTime / 60)}:${String(recordTime % 60).padStart(2, '0')}`;
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const fileName = `slide-voice-${Date.now().toString(36)}.webm`;
        // Transcribe
        try {
          const form = new FormData();
          const audioFile = new window.File([audioBlob], fileName, { type: 'audio/webm' });
          form.append('file', audioFile);
          form.append('context', `${workshop.customerName} workshop slide ${current?.number}: ${current?.title}`);
          const res = await fetch('/api/transcribe', { method: 'POST', body: form });
          const data = await res.json();
          if (data.text && current) {
            const note: SlideNote = { id: uid(), text: `Voice (${duration}): ${data.text.slice(0, 500)}` };
            updateSlide(activeSlide, { notes: [...current.notes, note] });
          }
        } catch { /* transcription failed */ }
      };
      rec.start();
      mediaRecRef.current = rec;
      setIsRecording(true);
      setRecordTime(0);
      timerRef.current = setInterval(() => setRecordTime(t => t + 1), 1000);
    } catch { /* mic unavailable */ }
  };

  const stopRecording = () => {
    mediaRecRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  // --- File upload ---
  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !current) return;
    const newUploads = Array.from(files).map(f => ({
      id: uid(), name: f.name, url: undefined as string | undefined,
    }));
    updateSlide(activeSlide, { uploads: [...current.uploads, ...newUploads] });
  };

  // --- AI Insights ---
  const generateInsights = async () => {
    if (!current) return;
    setAiLoading(true);
    try {
      const result = await chatMutation.mutateAsync({
        message: `Analyze this workshop slide and generate 3-5 key insights, observations, or discussion prompts.

Slide ${current.number}: ${current.title}
${current.subtitle ? `Subtitle: ${current.subtitle}` : ''}
Content: ${current.content.slice(0, 2000)}

Existing notes: ${current.notes.map(n => n.text).join('; ') || 'None'}
Existing stickies: ${current.stickies.map(s => s.text).join('; ') || 'None'}

Return each insight as a separate line starting with "- ".`,
        context: { page: 'workshop-slides' },
      });
      const lines = result.response.split('\n').filter((l: string) => l.trim().startsWith('-') || l.trim().startsWith('*'));
      const newStickies: SlideSticky[] = lines.slice(0, 5).map((line: string) => ({
        id: uid(),
        text: line.replace(/^[\-\*]\s*/, '').trim(),
        color: STICKY_COLORS[4].bg, // purple for AI
        votes: 0,
      }));
      if (newStickies.length > 0) {
        updateSlide(activeSlide, { stickies: [...current.stickies, ...newStickies] });
      }
    } catch { /* AI call failed */ }
    setAiLoading(false);
  };

  // --- Empty state ---
  // Upload PPTX → parse → create slides
  const [uploading, setUploading] = useState(false);
  const handlePptxUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', 'workshop');
      formData.append('entityId', workshop.id);
      const res = await fetch('/api/parse-doc', { method: 'POST', body: formData });
      if (res.ok) {
        const parsed = await res.json();
        if (parsed.slides && parsed.slides.length > 0) {
          // PPTX with slide-by-slide parsing
          const newSlides: WorkshopSlide[] = parsed.slides.map((s: any, i: number) => ({
            id: uid(), number: i + 1, title: s.title || `Slide ${i + 1}`,
            subtitle: '', content: s.content || '', formats: detectFormats(s.content || ''),
            stickies: [], notes: [], canvasData: '', uploads: [],
          }));
          setSlides(newSlides);
          slidesRef.current = newSlides;
          setTimeout(() => persist(), 100);
        } else if (parsed.text) {
          // Non-PPTX: split text into sections as slides
          const chunks = parsed.text.split(/\n{2,}/).filter((c: string) => c.trim().length > 20);
          const newSlides: WorkshopSlide[] = chunks.slice(0, 25).map((chunk: string, i: number) => ({
            id: uid(), number: i + 1, title: chunk.split('\n')[0]?.slice(0, 60) || `Section ${i + 1}`,
            subtitle: '', content: chunk, formats: [],
            stickies: [], notes: [], canvasData: '', uploads: [],
          }));
          setSlides(newSlides);
          slidesRef.current = newSlides;
          setTimeout(() => persist(), 100);
        }
      }
    } catch (e) { console.error('Slide upload error:', e); }
    setUploading(false);
  };

  // Auto-populate from Board sections if no slides but sections exist
  const handleCreateFromSections = () => {
    const wb = workshop.whiteboard;
    const sections = wb?.sections || [];
    if (sections.length === 0) return;
    const newSlides: WorkshopSlide[] = sections.map((s: any, i: number) => ({
      id: uid(), number: i + 1, title: s.title || `Section ${i + 1}`,
      subtitle: '', content: (s.children || []).map((c: any) => c.text || '').join('\n\n'),
      formats: [], stickies: [], notes: [], canvasData: '', uploads: [],
    }));
    setSlides(newSlides);
    persist();
  };

  // Detect format tags from content
  function detectFormats(text: string): string[] {
    const formats: string[] = [];
    const t = text.toUpperCase();
    if (t.includes('WHITEBOARD')) formats.push('WHITEBOARD');
    if (t.includes('STICKIES') || t.includes('STICKY')) formats.push('STICKIES');
    if (t.includes('DISCUSS')) formats.push('DISCUSS');
    if (t.includes('PRESENT')) formats.push('PRESENT');
    if (t.includes('PRIORITIZE')) formats.push('PRIORITIZE');
    if (t.includes('DOC INPUT')) formats.push('DOC INPUT');
    if (t.includes('READOUT')) formats.push('READOUT');
    if (t.includes('ALIGN')) formats.push('ALIGN');
    if (t.includes('SCORE')) formats.push('SCORE');
    return formats;
  }

  const hasBoardSections = (workshop.whiteboard?.sections || []).length > 0;

  if (slides.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 text-center">
        <FileText className="w-14 h-14 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No slides loaded</h3>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          Upload a PPTX to create interactive facilitation slides, or generate from your Board sections.
        </p>
        <div className="flex gap-3">
          <label className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors ${uploading ? 'bg-[#0FB5AD]/10 text-[#0FB5AD]' : 'bg-[#0FB5AD] text-white hover:bg-[#0a867f]'}`}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? 'Parsing...' : 'Upload PPTX'}
            <input type="file" className="hidden" accept=".pptx,.ppt,.pdf,.docx" onChange={e => { const f = e.target.files?.[0]; if (f) handlePptxUpload(f); e.target.value = ''; }} />
          </label>
          {hasBoardSections && (
            <button onClick={handleCreateFromSections}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border border-border text-foreground hover:bg-muted/30 transition-colors">
              <Layers className="h-4 w-4" /> Create from Board Sections
            </button>
          )}
        </div>
      </div>
    );
  }

  // --- Presenter mode ---
  if (isPresenterMode && current) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col"
        style={{ backgroundColor: '#0B1120' }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-white/10">
          <button onClick={() => goTo(activeSlide - 1)} disabled={activeSlide === 0}
            className="text-white/60 hover:text-white disabled:opacity-30 transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <span className="text-white/80 text-sm font-mono">
            Slide {current.number} of {slides.length}: {current.title}
          </span>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsPresenterMode(false)}
              className="text-white/60 hover:text-white transition-colors">
              <Minimize2 className="w-5 h-5" />
            </button>
            <button onClick={() => goTo(activeSlide + 1)} disabled={activeSlide === slides.length - 1}
              className="text-white/60 hover:text-white disabled:opacity-30 transition-colors">
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto flex justify-center px-6 py-8">
          <div className="max-w-4xl w-full">
            <h1 className="text-3xl font-bold text-white mb-2">{current.title}</h1>
            {current.subtitle && (
              <p className="text-lg text-white/60 mb-4">{current.subtitle}</p>
            )}
            <div className="flex gap-2 mb-6">
              {current.formats.map(f => {
                const badge = FORMAT_BADGES[f];
                return badge ? (
                  <span key={f} className={`text-xs px-2 py-0.5 rounded-full ${badge.bg}`}>{badge.text}</span>
                ) : null;
              })}
            </div>

            {/* Content blocks */}
            <div
              ref={contentEditRef}
              contentEditable
              suppressContentEditableWarning
              onBlur={handleContentBlur}
              onFocus={() => setEditingText(current.id)}
              className="text-lg text-white/90 leading-relaxed whitespace-pre-wrap outline-none
                         focus:ring-1 focus:ring-teal-500/30 rounded-lg p-4 -ml-4"
            >
              {current.content}
            </div>

            {/* Stickies */}
            {current.stickies.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm font-mono text-white/40 uppercase tracking-wider mb-3">
                  Stickies ({current.stickies.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {current.stickies.map(s => (
                    <div key={s.id} className="rounded-lg p-3 text-sm shadow-md"
                      style={{ backgroundColor: s.color }}>
                      <p className="text-gray-800">{s.text}</p>
                      {s.votes > 0 && (
                        <span className="text-xs text-gray-600 mt-1 inline-block">
                          {s.votes} vote{s.votes !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {current.notes.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm font-mono text-white/40 uppercase tracking-wider mb-3">
                  Notes ({current.notes.length})
                </h3>
                <div className="space-y-2">
                  {current.notes.map(n => (
                    <div key={n.id} className="bg-white/5 border border-white/10 rounded-lg px-4 py-3">
                      <p className="text-white/80 text-sm">{n.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom nav */}
        <div className="flex items-center justify-center gap-4 px-6 py-3 border-t border-white/10">
          <span className="text-xs text-white/40 font-mono">
            ESC to exit &middot; Arrow keys to navigate
          </span>
        </div>
      </div>
    );
  }

  // --- Standard layout ---
  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Nav bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
        <button onClick={() => goTo(activeSlide - 1)} disabled={activeSlide === 0}
          className="p-1.5 rounded hover:bg-muted disabled:opacity-30 transition-colors">
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono text-muted-foreground">
            Slide {current?.number || 0} of {slides.length}
          </span>
          {current && (
            <span className="text-sm font-semibold text-foreground truncate max-w-[400px]">
              {current.title}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Saving...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Check className="w-3 h-3 text-teal-600" /> Saved
            </span>
          )}
          <button onClick={() => setIsPresenterMode(true)}
            className="p-1.5 rounded hover:bg-muted transition-colors" title="Presenter mode">
            <Maximize2 className="w-5 h-5 text-foreground" />
          </button>
          <button onClick={() => goTo(activeSlide + 1)} disabled={activeSlide === slides.length - 1}
            className="p-1.5 rounded hover:bg-muted disabled:opacity-30 transition-colors">
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Thumbnail rail */}
        <div className="w-20 border-r border-border bg-card overflow-y-auto flex-shrink-0">
          {slides.map((slide, idx) => (
            <button
              key={slide.id}
              onClick={() => goTo(idx)}
              className={`w-full px-1 py-1.5 border-b border-border transition-colors text-left
                ${idx === activeSlide
                  ? 'bg-teal-50 dark:bg-teal-900/20 border-l-2 border-l-teal-500'
                  : 'hover:bg-muted border-l-2 border-l-transparent'
                }`}
            >
              <div className="text-[10px] font-mono text-muted-foreground leading-none mb-0.5">
                {slide.number}
              </div>
              <div className="text-[9px] text-foreground leading-tight line-clamp-2">
                {slide.title}
              </div>
            </button>
          ))}
        </div>

        {/* Slide content */}
        {current && (
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="max-w-3xl mx-auto">
              {/* Title */}
              <h2 className="text-xl font-semibold text-foreground mb-1">{current.title}</h2>
              {current.subtitle && (
                <p className="text-sm text-muted-foreground mb-3">{current.subtitle}</p>
              )}

              {/* Format badges */}
              {current.formats.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {current.formats.map(f => {
                    const badge = FORMAT_BADGES[f] || { bg: 'bg-gray-100 text-gray-600', text: f };
                    return (
                      <span key={f} className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${badge.bg}`}>
                        {badge.text}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Content blocks */}
              <div className="mb-6">
                {current.content.split('\n').filter(Boolean).map((block, i) => (
                  <div key={i} className="bg-card border border-border rounded-lg p-3 mb-2
                    border-l-4 border-l-teal-500/30">
                    <div
                      contentEditable
                      suppressContentEditableWarning
                      ref={i === 0 ? contentEditRef : undefined}
                      onBlur={(e) => {
                        const lines = current.content.split('\n');
                        const nonEmpty = lines.filter(Boolean);
                        nonEmpty[i] = (e.target as HTMLElement).innerText;
                        updateSlide(activeSlide, { content: nonEmpty.join('\n') });
                      }}
                      className="text-sm text-foreground outline-none focus:ring-1 focus:ring-teal-500/20
                        rounded px-1 -mx-1"
                    >
                      {block}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-border my-4" />

              {/* ── SCORE zone (shown when SCORE format) ── */}
              {current.formats.includes('SCORE') && (
                <div className="mb-6">
                  <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" /> Maturity Score
                  </h3>
                  <div className="flex gap-2">
                    {MATURITY_LABELS.map((label, val) => (
                      <button key={val}
                        className="flex-1 rounded-lg border border-border px-2 py-2 text-center
                          hover:border-teal-500 transition-colors"
                        style={{ borderColor: MATURITY_COLORS[val] + '40' }}
                      >
                        <div className="text-lg font-bold" style={{ color: MATURITY_COLORS[val] }}>{val}</div>
                        <div className="text-[9px] text-muted-foreground">{label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── WHITEBOARD zone ── */}
              {current.formats.includes('WHITEBOARD') && (
                <div className="mb-6">
                  <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <PenTool className="w-3.5 h-3.5" /> Sketch Area
                  </h3>
                  <div className="border border-dashed border-border rounded-lg bg-muted/30 h-[200px]
                    flex items-center justify-center text-muted-foreground text-sm">
                    <PenTool className="w-5 h-5 mr-2 opacity-40" />
                    Canvas sketching available in Whiteboard tab
                  </div>
                </div>
              )}

              {/* ── Stickies zone ── */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <StickyNote className="w-3.5 h-3.5" /> Stickies ({current.stickies.length})
                  </h3>
                  <button onClick={() => setAddingSticky(true)}
                    className="text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>

                {addingSticky && (
                  <div className="bg-card border border-border rounded-lg p-3 mb-3">
                    <textarea
                      value={newStickyText}
                      onChange={(e) => setNewStickyText(e.target.value)}
                      placeholder="Type your sticky note..."
                      className="w-full text-sm bg-transparent border-none outline-none resize-none
                        placeholder:text-muted-foreground"
                      rows={2}
                      autoFocus
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addSticky(); } }}
                    />
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex gap-1">
                        {STICKY_COLORS.map((c, i) => (
                          <button key={i} onClick={() => setNewStickyColor(i)}
                            className={`w-5 h-5 rounded-full border-2 transition-all
                              ${i === newStickyColor ? 'border-foreground scale-110' : 'border-transparent'}`}
                            style={{ backgroundColor: c.bg }}
                          />
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setAddingSticky(false); setNewStickyText(''); }}
                          className="text-xs text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                        <button onClick={addSticky}
                          className="text-xs bg-teal-600 text-white px-3 py-1 rounded hover:bg-teal-700">Add</button>
                      </div>
                    </div>
                  </div>
                )}

                {current.stickies.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {current.stickies.map(s => (
                      <div key={s.id} className="rounded-lg p-2.5 text-xs shadow-sm group relative"
                        style={{ backgroundColor: s.color }}>
                        <p className="text-gray-800 leading-snug">{s.text}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <button onClick={() => voteSticky(s.id)}
                            className="flex items-center gap-0.5 text-gray-500 hover:text-gray-700">
                            <ThumbsUp className="w-3 h-3" />
                            {s.votes > 0 && <span>{s.votes}</span>}
                          </button>
                          <button onClick={() => deleteSticky(s.id)}
                            className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Notes zone ── */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" /> Notes ({current.notes.length})
                  </h3>
                  <button onClick={() => setAddingNote(true)}
                    className="text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>

                {addingNote && (
                  <div className="bg-card border border-border rounded-lg p-3 mb-3">
                    <textarea
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      placeholder="Add a note or observation..."
                      className="w-full text-sm bg-transparent border-none outline-none resize-none
                        placeholder:text-muted-foreground"
                      rows={2}
                      autoFocus
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addNote(); } }}
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <button onClick={() => { setAddingNote(false); setNewNoteText(''); }}
                        className="text-xs text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                      <button onClick={addNote}
                        className="text-xs bg-teal-600 text-white px-3 py-1 rounded hover:bg-teal-700">Add</button>
                    </div>
                  </div>
                )}

                {current.notes.length > 0 && (
                  <div className="space-y-1.5">
                    {current.notes.map(n => (
                      <div key={n.id} className="bg-card border border-border rounded-lg px-3 py-2
                        flex items-start justify-between group">
                        <p className="text-sm text-foreground flex-1">{n.text}</p>
                        <button onClick={() => deleteNote(n.id)}
                          className="text-muted-foreground hover:text-red-500 opacity-0
                            group-hover:opacity-100 transition-opacity ml-2 mt-0.5">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Uploads zone ── */}
              {current.uploads.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Uploads ({current.uploads.length})
                  </h3>
                  <div className="space-y-1">
                    {current.uploads.map(u => (
                      <div key={u.id} className="flex items-center gap-2 text-xs text-muted-foreground
                        bg-muted/50 rounded px-2 py-1.5">
                        <FileText className="w-3 h-3" />
                        <span className="truncate">{u.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Action bar ── */}
              <div className="border-t border-border pt-4 mt-4">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Record */}
                  {isRecording ? (
                    <button onClick={stopRecording}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                        bg-red-50 text-red-600 border border-red-200 hover:bg-red-100">
                      <Square className="w-3.5 h-3.5" />
                      Stop {Math.floor(recordTime / 60)}:{String(recordTime % 60).padStart(2, '0')}
                    </button>
                  ) : (
                    <button onClick={startRecording}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                        bg-card border border-border text-foreground hover:bg-muted transition-colors">
                      <Mic className="w-3.5 h-3.5" /> Record
                    </button>
                  )}

                  {/* Upload */}
                  <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                    bg-card border border-border text-foreground hover:bg-muted transition-colors cursor-pointer">
                    <Upload className="w-3.5 h-3.5" /> Upload
                    <input type="file" className="hidden" multiple
                      onChange={(e) => handleUpload(e.target.files)} />
                  </label>

                  {/* AI Insights */}
                  <button onClick={generateInsights} disabled={aiLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                      bg-purple-50 border border-purple-200 text-purple-700
                      hover:bg-purple-100 disabled:opacity-50 transition-colors">
                    {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {aiLoading ? 'Generating...' : 'AI Insights'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Copilot sidebar */}
      {copilotOpen && !isPresenterMode && (
        <div className="w-[280px] border-l border-border flex flex-col shrink-0 bg-card absolute right-0 top-0 bottom-0 z-20">
          <div className="px-3 py-2.5 bg-[#0B1120] text-white flex items-center gap-2 shrink-0">
            <Sparkles className="h-3 w-3 text-[#0FB5AD]" />
            <span className="text-[10px] font-semibold">Slide Copilot</span>
            <span className="text-[8px] text-white/40 ml-auto">Slide {activeSlide + 1}</span>
            <button onClick={() => setCopilotOpen(false)} className="p-0.5 text-white/40 hover:text-white"><X className="h-3 w-3" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
            {chatMessages.length === 0 && (
              <div className="space-y-1.5 py-2">
                <p className="text-[9px] text-muted-foreground text-center">Ask about this slide or add content</p>
                {[
                  'Add stickies for key observations',
                  'Summarize this slide\'s discussion points',
                  'What questions should we ask here?',
                  `Suggest action items for ${workshop.customerName}`,
                ].map((q, i) => (
                  <button key={i} onClick={() => setChatInput(q)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg bg-secondary/30 text-[9px] text-foreground hover:bg-secondary/50">{q}</button>
                ))}
              </div>
            )}
            {chatMessages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] px-2.5 py-1.5 rounded-xl text-[10px] leading-relaxed ${
                  m.role === 'user' ? 'bg-[#0FB5AD] text-white rounded-tr-sm' : 'bg-secondary/50 text-foreground rounded-tl-sm'
                }`}>{m.text}</div>
              </div>
            ))}
            {chatThinking && (
              <div className="flex justify-start">
                <div className="px-2.5 py-1.5 rounded-xl bg-secondary/50 text-[9px] text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-2.5 w-2.5 animate-spin text-[#0FB5AD]" /> Thinking...
                </div>
              </div>
            )}
            <div ref={copilotEndRef} />
          </div>
          <div className="px-2.5 py-2 border-t border-border shrink-0 flex gap-1">
            <input value={chatInput} onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCopilotChat()}
              placeholder="Ask about this slide..."
              className="flex-1 px-2.5 py-1 text-[9px] bg-secondary/30 border border-border rounded text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#0FB5AD]/40" />
            <button onClick={handleCopilotChat} disabled={!chatInput.trim() || chatThinking}
              className="p-1.5 rounded bg-[#0FB5AD] text-white disabled:opacity-40"><Send className="h-3 w-3" /></button>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-card text-xs">
        <button onClick={() => goTo(activeSlide - 1)} disabled={activeSlide === 0}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground disabled:opacity-30">
          <ChevronLeft className="w-4 h-4" /> Prev
        </button>
        <div className="flex items-center gap-3">
          <span className="font-mono text-muted-foreground">
            {activeSlide + 1} / {slides.length}
          </span>
          <div className="flex gap-0.5">
            {slides.map((_, i) => (
              <button key={i} onClick={() => goTo(i)}
                className={`w-1.5 h-1.5 rounded-full transition-colors
                  ${i === activeSlide ? 'bg-teal-500' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'}`}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCopilotOpen(o => !o)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-colors ${copilotOpen ? 'border-[#0FB5AD]/30 text-[#0FB5AD] bg-[#0FB5AD]/10' : 'border-border text-muted-foreground hover:text-foreground'}`}>
            <MessageSquare className="h-3 w-3" /> Copilot
          </button>
          <button onClick={() => goTo(activeSlide + 1)} disabled={activeSlide === slides.length - 1}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground disabled:opacity-30">
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
