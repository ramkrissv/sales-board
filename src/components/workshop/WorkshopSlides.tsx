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

interface SlideCard {
  heading: string;
  body: string;
}

interface SlideKpi {
  value: string;
  label: string;
}

interface SlideTextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  size?: number | null;
  color?: string | null;
  name?: string | null;
}

interface SlideParagraph {
  text: string;
  align?: string;
  runs?: SlideTextRun[];
}

interface SlideShape {
  left: number;    // % of slide width
  top: number;     // % of slide height
  width: number;   // % of slide width
  height: number;  // % of slide height
  text: string;
  fill: string | null;
  border: string | null;
  borderWidth: number;
  cornerRadius: number;
  rotation: number;
  type: string;    // rect | auto | text | image | group | table
  paragraphs: SlideParagraph[];
}

interface WorkshopSlide {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  content: string;
  contentBlocks?: string[];
  cards?: SlideCard[];
  kpis?: SlideKpi[];
  misc?: string[];
  slideLabel?: string;
  formats: string[];
  shapes?: SlideShape[];
  bgColor?: string | null;
  imageBase64?: string;  // Full slide image from LibreOffice rendering
  stickies: SlideSticky[];
  notes: SlideNote[];
  canvasData: string;
  uploads: { id: string; name: string; url?: string }[];
}

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Check if a hex color is light (for text contrast) */
function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  if (c.length < 6) return false;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 140;
}

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

  // --- Upload state ---
  const [uploading, setUploading] = useState(false);
  // Merge/Replace/Cancel confirmation
  const [pendingUpload, setPendingUpload] = useState<WorkshopSlide[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseSlidesToWorkshopSlides = (parsed: any): WorkshopSlide[] => {
    if (parsed.slides && parsed.slides.length > 0) {
      return parsed.slides.map((s: any) => ({
        id: uid(), number: s.slideNumber || 1,
        title: s.title || `Slide ${s.slideNumber}`,
        subtitle: s.subtitle || '',
        content: s.content || '',
        contentBlocks: s.contentBlocks || [],
        cards: s.cards || [],
        kpis: s.kpis || [],
        misc: s.misc || [],
        formats: s.formats || [],
        shapes: s.shapes || [],
        bgColor: s.bgColor || null,
        imageBase64: s.imageBase64 || undefined,
        slideLabel: s.slideLabel || '',
        stickies: [], notes: [], canvasData: '', uploads: [],
      }));
    } else if (parsed.text) {
      const chunks = parsed.text.split(/\n{2,}/).filter((c: string) => c.trim().length > 20);
      return chunks.slice(0, 25).map((chunk: string, i: number) => ({
        id: uid(), number: i + 1, title: chunk.split('\n')[0]?.slice(0, 60) || `Section ${i + 1}`,
        subtitle: '', content: chunk, formats: [],
        stickies: [], notes: [], canvasData: '', uploads: [],
      }));
    }
    return [];
  };

  // AI enhancement: for slides where parser couldn't extract colors/layout,
  // ask AI to classify content and suggest visual treatment
  const aiEnhanceSlides = async (rawSlides: WorkshopSlide[]): Promise<WorkshopSlide[]> => {
    try {
      // Build a compact summary of slides that need enhancement
      const slidesNeedingHelp = rawSlides.filter(s => {
        // Slides with shapes but most have no fill = theme colors not extracted
        const shapesNoFill = (s.shapes || []).filter(sh => !sh.fill && sh.text);
        return shapesNoFill.length > 2 || (!(s.shapes?.length) && s.contentBlocks && s.contentBlocks.length > 2);
      });

      if (slidesNeedingHelp.length === 0) return rawSlides;

      // Ask AI to classify content blocks and suggest cards/kpis/colors
      const slideSummaries = slidesNeedingHelp.slice(0, 15).map(s => ({
        num: s.number,
        title: s.title,
        subtitle: s.subtitle,
        blocks: (s.contentBlocks || []).slice(0, 15),
        shapeTexts: (s.shapes || []).filter(sh => sh.text).map(sh => ({
          text: sh.text.slice(0, 100),
          hasFill: !!sh.fill,
          w: sh.width,
          h: sh.height,
        })).slice(0, 15),
      }));

      const result = await chatMutation.mutateAsync({
        message: `Analyze these presentation slides and classify their content blocks for visual rendering.

For each slide, return JSON with:
- cards: [{heading, body}] — paired heading+description blocks (for card grid layout)
- kpis: [{value, label}] — numeric stats with labels (for KPI band)
- suggestedBg: hex color for slide background (dark theme preferred, e.g. #0B1120, #1a1a2e, #0f172a)
- shapeFills: [{index, fill}] — suggested fill colors for shapes without fills (use brand colors: #0FB5AD teal, #0B1120 navy, #1e293b slate, #111827 dark gray, #D97A2B copper, #ffffff white)

Slides: ${JSON.stringify(slideSummaries)}

Return ONLY a JSON array with one object per slide, matching by slide number. Example:
[{"num":1,"cards":[],"kpis":[{"value":"50+","label":"Use Cases"}],"suggestedBg":"#0B1120","shapeFills":[{"index":2,"fill":"#0FB5AD"}]}]`,
        context: { page: 'workshop-slides' },
      });

      // Parse AI response
      try {
        const jsonMatch = result.response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const enhancements = JSON.parse(jsonMatch[0]);
          const enhMap = new Map(enhancements.map((e: any) => [e.num, e]));

          return rawSlides.map(s => {
            const enh = enhMap.get(s.number) as any;
            if (!enh) return s;

            // Merge AI-suggested cards/kpis if parser didn't find them
            const mergedCards = (s.cards?.length || 0) > 0 ? s.cards : (enh.cards || []);
            const mergedKpis = (s.kpis?.length || 0) > 0 ? s.kpis : (enh.kpis || []);

            // Apply suggested fill colors to shapes without fills
            let mergedShapes = s.shapes;
            if (enh.shapeFills && s.shapes) {
              mergedShapes = s.shapes.map((sh, idx) => {
                if (sh.fill) return sh;
                const suggested = enh.shapeFills.find((sf: any) => sf.index === idx);
                return suggested ? { ...sh, fill: suggested.fill } : sh;
              });
            }

            return {
              ...s,
              cards: mergedCards,
              kpis: mergedKpis,
              bgColor: s.bgColor || enh.suggestedBg || null,
              shapes: mergedShapes,
            };
          });
        }
      } catch { /* AI parse failed — use raw slides */ }
    } catch { /* AI call failed — use raw slides */ }
    return rawSlides;
  };

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
        let newSlides = parseSlidesToWorkshopSlides(parsed);

        // AI enhancement pass — fill in missing colors/layout
        if (newSlides.length > 0) {
          try {
            newSlides = await aiEnhanceSlides(newSlides);
          } catch { /* continue without AI enhancement */ }
        }

        if (newSlides.length > 0) {
          if (slides.length > 0) {
            setPendingUpload(newSlides);
          } else {
            setSlides(newSlides);
            slidesRef.current = newSlides;
            setTimeout(() => persist(), 100);
          }
        }
      }
    } catch (e) { console.error('Slide upload error:', e); }
    setUploading(false);
  };

  const handleUploadReplace = () => {
    if (!pendingUpload) return;
    setSlides(pendingUpload);
    slidesRef.current = pendingUpload;
    setActiveSlide(0);
    setPendingUpload(null);
    setTimeout(() => persist(), 100);
  };

  const handleUploadMerge = () => {
    if (!pendingUpload) return;
    // Append new slides after existing, renumber
    const merged = [...slides, ...pendingUpload.map((s, i) => ({
      ...s, number: slides.length + i + 1,
    }))];
    setSlides(merged);
    slidesRef.current = merged;
    setPendingUpload(null);
    setTimeout(() => persist(), 100);
  };

  const handleUploadCancel = () => {
    setPendingUpload(null);
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

  // Check for board sections in any format (direct or nested)
  const wb = workshop.whiteboard || {};
  const boardSections = wb.sections || [];
  const hasBoardSections = boardSections.length > 0;

  if (slides.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 text-center">
        <FileText className="w-14 h-14 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Show &amp; Tell</h3>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          Upload a PPTX to replicate your deck as interactive facilitation canvases, or create from your Board sections.
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

        {/* Content — full screen PPT canvas */}
        <div className="flex-1 overflow-hidden flex items-center justify-center p-6">
          {current.imageBase64 ? (
            /* Pixel-perfect slide image — full screen */
            <div className="relative w-full h-full flex items-center justify-center">
              <img src={current.imageBase64} alt={current.title}
                className="max-w-full max-h-full object-contain rounded"
                draggable={false} />
            </div>
          ) : current.shapes && current.shapes.length > 0 ? (
            /* Shape-based PPT canvas — full screen */
            <div className="relative w-full h-full" style={{
              maxWidth: '100%',
              maxHeight: '100%',
              aspectRatio: '16 / 9',
              background: current.bgColor || '#ffffff',
              borderRadius: '4px',
              overflow: 'hidden',
            }}>
              {current.shapes.map((shape, si) => {
                const firstRun = shape.paragraphs?.[0]?.runs?.[0];
                const fontSize = firstRun?.size ? firstRun.size * 1.5 : Math.max(10, Math.min(36, shape.height * 0.4));
                const textColor = firstRun?.color || (shape.fill && isLightColor(shape.fill) ? '#1a1a2e' : '#ffffff');
                const isBold = firstRun?.bold || false;
                const textAlign = shape.paragraphs?.[0]?.align || 'left';
                if (shape.width < 0.5 && shape.height < 0.5) return null;
                if (!shape.text && !shape.fill) return null;
                return (
                  <div key={si} className="absolute overflow-hidden" style={{
                    left: `${shape.left}%`, top: `${shape.top}%`,
                    width: `${shape.width}%`, height: `${shape.height}%`,
                    backgroundColor: shape.fill || 'transparent',
                    border: shape.border ? `${Math.max(1, shape.borderWidth)}px solid ${shape.border}` : 'none',
                    borderRadius: shape.cornerRadius > 0 ? `${shape.cornerRadius * 0.4}px` : '0',
                    transform: shape.rotation ? `rotate(${shape.rotation}deg)` : undefined,
                    zIndex: si + 1,
                  }}>
                    {shape.paragraphs && shape.paragraphs.length > 0 ? (
                      <div className="w-full h-full flex flex-col justify-center px-[6%] py-[4%]">
                        {shape.paragraphs.map((para, pi) => (
                          <div key={pi} style={{ textAlign: (para.align || textAlign) as any, marginBottom: '3px' }}>
                            {para.runs && para.runs.length > 0 ? para.runs.map((run, ri) => (
                              <span key={ri} style={{
                                color: run.color || textColor,
                                fontSize: `${Math.max(8, Math.min(56, (run.size || fontSize) * 1.5))}px`,
                                fontWeight: run.bold ? 700 : 400,
                                fontStyle: run.italic ? 'italic' : 'normal',
                                lineHeight: 1.3,
                              }}>{run.text}</span>
                            )) : (
                              <span style={{ color: textColor, fontSize: `${Math.max(8, Math.min(48, fontSize))}px`, fontWeight: isBold ? 700 : 400, lineHeight: 1.3 }}>{para.text}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : shape.text ? (
                      <div className="w-full h-full flex items-center justify-center px-[6%]">
                        <span style={{ color: textColor, fontSize: `${Math.max(8, Math.min(48, fontSize))}px`, fontWeight: isBold ? 700 : 400, lineHeight: 1.3 }}>{shape.text}</span>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Fallback text-based presenter */
            <div className="max-w-4xl w-full">
              <h1 className="text-4xl font-bold text-white mb-3">{current.title}</h1>
              {current.subtitle && <p className="text-xl text-white/60 mb-6">{current.subtitle}</p>}
              <div className="text-lg text-white/90 leading-relaxed whitespace-pre-wrap">{current.content}</div>
            </div>
          )}
        </div>

        {/* Stickies & Notes overlay */}
        {(current.stickies.length > 0 || current.notes.length > 0) && (
          <div className="px-6 pb-4 max-h-[25vh] overflow-y-auto">
            <div className="max-w-4xl mx-auto flex gap-6">
              {current.stickies.length > 0 && (
                <div className="flex-1">
                  <h3 className="text-[10px] font-mono text-white/30 uppercase tracking-wider mb-2">Stickies</h3>
                  <div className="flex flex-wrap gap-2">
                    {current.stickies.map(s => (
                      <div key={s.id} className="rounded-lg px-3 py-2 text-xs shadow-md" style={{ backgroundColor: s.color }}>
                        <p className="text-gray-800">{s.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {current.notes.length > 0 && (
                <div className="flex-1">
                  <h3 className="text-[10px] font-mono text-white/30 uppercase tracking-wider mb-2">Notes</h3>
                  <div className="space-y-1">
                    {current.notes.map(n => (
                      <div key={n.id} className="bg-white/5 rounded-lg px-3 py-2">
                        <p className="text-white/70 text-xs">{n.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

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
    <div className="flex flex-col h-full relative" style={{ background: '#0a0f1e' }}>
      {/* Nav bar — dark chrome */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06]"
        style={{ background: '#0B1120' }}>
        <button onClick={() => goTo(activeSlide - 1)} disabled={activeSlide === 0}
          className="p-1.5 rounded hover:bg-white/10 disabled:opacity-20 transition-colors">
          <ChevronLeft className="w-5 h-5 text-white/60" />
        </button>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-white/30">
            {current?.slideLabel || String(current?.number || 0).padStart(2, '0')} / {slides.length}
          </span>
          {current && (
            <span className="text-sm font-semibold text-white/80 truncate max-w-[400px]">
              {current.title}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && (
            <span className="text-[10px] text-white/30 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin text-[#0FB5AD]" /> Saving
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-[10px] text-white/30 flex items-center gap-1">
              <Check className="w-3 h-3 text-[#0FB5AD]" /> Saved
            </span>
          )}
          {/* Re-upload */}
          <label className="p-1.5 rounded hover:bg-white/10 transition-colors cursor-pointer" title="Upload PPTX">
            {uploading ? <Loader2 className="w-4 h-4 text-[#0FB5AD] animate-spin" /> : <Upload className="w-4 h-4 text-white/50" />}
            <input ref={fileInputRef} type="file" className="hidden" accept=".pptx,.ppt,.pdf,.docx"
              onChange={e => { const f = e.target.files?.[0]; if (f) handlePptxUpload(f); e.target.value = ''; }} />
          </label>
          <button onClick={() => setIsPresenterMode(true)}
            className="p-1.5 rounded hover:bg-white/10 transition-colors" title="Presenter mode">
            <Maximize2 className="w-4 h-4 text-white/50" />
          </button>
          <button onClick={() => goTo(activeSlide + 1)} disabled={activeSlide === slides.length - 1}
            className="p-1.5 rounded hover:bg-white/10 disabled:opacity-20 transition-colors">
            <ChevronRight className="w-5 h-5 text-white/60" />
          </button>
        </div>
      </div>

      {/* ═══ Merge / Replace / Cancel Popup ═══ */}
      {pendingUpload && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl" style={{
            background: 'linear-gradient(135deg, #111827, #0f1629)',
            border: '1px solid rgba(15,181,173,0.2)',
          }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(15,181,173,0.15)' }}>
                <Layers className="w-5 h-5 text-[#0FB5AD]" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Slides Already Exist</h3>
                <p className="text-xs text-white/40">
                  {slides.length} existing &middot; {pendingUpload.length} new slides parsed
                </p>
              </div>
            </div>
            <p className="text-sm text-white/50 mb-5">
              You already have {slides.length} slide{slides.length !== 1 ? 's' : ''}. How would you like to handle the {pendingUpload.length} new slide{pendingUpload.length !== 1 ? 's' : ''}?
            </p>
            <div className="flex gap-2">
              <button onClick={handleUploadMerge}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
                  transition-colors text-white"
                style={{ background: 'rgba(15,181,173,0.15)', border: '1px solid rgba(15,181,173,0.3)' }}>
                <Plus className="w-4 h-4" /> Merge
              </button>
              <button onClick={handleUploadReplace}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
                  transition-colors text-white"
                style={{ background: 'rgba(217,122,43,0.15)', border: '1px solid rgba(217,122,43,0.3)' }}>
                <Layers className="w-4 h-4" /> Replace
              </button>
              <button onClick={handleUploadCancel}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
                  text-white/50 hover:text-white/80 transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <X className="w-4 h-4" /> Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Thumbnail rail — dark PPT-style */}
        <div className="w-24 border-r border-white/[0.06] overflow-y-auto flex-shrink-0"
          style={{ background: 'linear-gradient(180deg, #0B1120, #0f1629)' }}>
          {slides.map((slide, idx) => {
            const isActive = idx === activeSlide;
            const hasKpis = (slide.kpis?.length || 0) > 0;
            const hasCards = (slide.cards?.length || 0) > 0;
            return (
              <button
                key={slide.id}
                onClick={() => goTo(idx)}
                className={`w-full px-2 py-2 border-b border-white/[0.04] transition-all text-left relative
                  ${isActive
                    ? 'bg-[#0FB5AD]/10'
                    : 'hover:bg-white/[0.03]'
                  }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-[#0FB5AD]" />
                )}
                {/* Mini slide preview */}
                <div className={`rounded border mb-1.5 h-[42px] flex items-center justify-center overflow-hidden
                  ${isActive ? 'border-[#0FB5AD]/40' : 'border-white/[0.08]'}`}
                  style={{ background: slide.imageBase64 ? 'transparent' : '#f5f5f5' }}>
                  {slide.imageBase64 ? (
                    <img src={slide.imageBase64} alt="" className="w-full h-full object-cover" draggable={false} />
                  ) : hasKpis ? (
                    <div className="flex gap-1">
                      {(slide.kpis || []).slice(0, 3).map((_, ki) => (
                        <div key={ki} className="w-1.5 h-3 rounded-sm bg-[#0FB5AD]/40" />
                      ))}
                    </div>
                  ) : hasCards && !hasKpis ? (
                    <div className="grid grid-cols-2 gap-0.5 p-1">
                      {(slide.cards || []).slice(0, 4).map((_, ci) => (
                        <div key={ci} className="w-3 h-2 rounded-[1px] bg-gray-300" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-0.5 p-1.5">
                      <div className="h-[2px] w-8 bg-gray-300 rounded-full" />
                      <div className="h-[2px] w-6 bg-gray-200 rounded-full" />
                    </div>
                  )}
                </div>
                <div className={`text-[9px] font-mono leading-none mb-0.5 ${isActive ? 'text-[#0FB5AD]' : 'text-white/30'}`}>
                  {slide.slideLabel || String(slide.number).padStart(2, '0')}
                </div>
                <div className={`text-[8px] leading-tight line-clamp-2 ${isActive ? 'text-white/80' : 'text-white/40'}`}>
                  {slide.title}
                </div>
              </button>
            );
          })}
        </div>

        {/* Slide content — integrated interactive canvas */}
        {current && (
          <div className="flex-1 overflow-hidden relative" style={{ background: '#f0f0f0' }}>
            {/* ═══ SLIDE CANVAS ═══ */}
            <div className="flex justify-center items-start h-full p-4 pb-16 overflow-y-auto">
              <div className="relative w-full" style={{
                maxWidth: '1200px',
                aspectRatio: '16 / 9',
                borderRadius: '6px',
                overflow: 'visible',
                boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
              }}>
                {/* Slide image or fallback */}
                {current.imageBase64 ? (
                  <img src={current.imageBase64} alt={`Slide ${current.number}`}
                    className="w-full h-full object-contain rounded-md" draggable={false} />
                ) : (
                  <div className="w-full h-full rounded-md bg-white flex flex-col">
                    {/* Fallback header */}
                    <div className="px-6 pt-5 pb-3 border-b border-gray-100">
                      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-purple-600 font-bold mb-1.5">
                        Slide {current.slideLabel || String(current.number).padStart(2, '0')} of {slides.length}
                      </div>
                      <h2 className="text-xl font-bold text-gray-900 leading-tight" contentEditable suppressContentEditableWarning
                        onBlur={e => updateSlide(activeSlide, { title: e.currentTarget.textContent || '' })}>{current.title}</h2>
                      {current.subtitle && (
                        <p className="text-sm text-gray-500 mt-1" contentEditable suppressContentEditableWarning
                          onBlur={e => updateSlide(activeSlide, { subtitle: e.currentTarget.textContent || '' })}>{current.subtitle}</p>
                      )}
                      {current.formats.length > 0 && (
                        <div className="flex gap-1.5 mt-2">
                          {current.formats.map(f => {
                            const badge = FORMAT_BADGES[f] || { bg: 'bg-gray-100 text-gray-600', text: f };
                            return <span key={f} className={`text-[9px] font-mono px-2 py-0.5 rounded-md ${badge.bg}`}>{badge.text}</span>;
                          })}
                        </div>
                      )}
                    </div>
                    {/* Fallback content */}
                    <div className="flex-1 px-6 py-4 overflow-y-auto">
                      {(() => {
                        const cards = current.cards?.length ? current.cards : [];
                        const kpis = current.kpis?.length ? current.kpis : [];
                        const blocks = current.contentBlocks?.length ? current.contentBlocks
                          : current.content ? current.content.split('\n\n').filter(Boolean) : [];
                        const ACCENTS = ['#0FB5AD', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899', '#10B981'];
                        return (
                          <div className="space-y-4">
                            {kpis.length > 0 && (
                              <div className="rounded-lg p-4 bg-gray-50 border border-gray-100">
                                <div className={`grid ${kpis.length <= 3 ? 'grid-cols-' + kpis.length : 'grid-cols-3'}`}>
                                  {kpis.map((kpi, ki) => (
                                    <div key={ki} className="text-center py-1">
                                      <div className="text-2xl font-bold" style={{ color: '#0FB5AD' }}>{kpi.value}</div>
                                      <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">{kpi.label}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {cards.length >= 2 && (
                              <div className={`grid gap-3 ${cards.length <= 3 ? 'grid-cols-' + cards.length : 'grid-cols-2 lg:grid-cols-3'}`}>
                                {cards.map((c, ci) => (
                                  <div key={ci} className="rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
                                    <div className="h-[3px]" style={{ background: ACCENTS[ci % 6] }} />
                                    {c.heading && <div className="px-3 py-2 border-b border-gray-100 text-[12px] font-semibold text-gray-900">{c.heading}</div>}
                                    <div className="px-3 py-2 text-[11px] text-gray-600 leading-relaxed">{c.body}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                            {cards.length < 2 && blocks.length > 0 && blocks.map((b, bi) => {
                              const t = b.trim(); if (!t) return null;
                              return (
                                <div key={bi} className="flex">
                                  <div className="w-[3px] shrink-0 rounded-full mr-3" style={{ background: ACCENTS[bi % 6] }} />
                                  <div className="text-[12px] text-gray-700 leading-[1.7] whitespace-pre-wrap"
                                    contentEditable suppressContentEditableWarning>{t}</div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* ═══ INTERACTIVE STICKIES overlaid on slide ═══ */}
                {current.stickies.length > 0 && current.stickies.map((s, si) => {
                  const col = si % 4;
                  const row = Math.floor(si / 4);
                  const left = 5 + col * 23 + ((si * 7) % 5);
                  const top = 15 + row * 28 + ((si * 3) % 8);
                  const rot = -6 + (si * 4) % 12;
                  return (
                    <div key={s.id} className="absolute group cursor-pointer z-10"
                      style={{ left: `${left}%`, top: `${top}%`, transform: `rotate(${rot}deg)`, width: '140px' }}>
                      <div className="rounded-sm p-2.5 text-[10px] leading-snug shadow-lg"
                        style={{ backgroundColor: s.color, boxShadow: '3px 4px 10px rgba(0,0,0,0.15)' }}>
                        <p className="text-gray-800" contentEditable suppressContentEditableWarning
                          onBlur={e => {
                            const newStickies = [...current.stickies];
                            newStickies[si] = { ...s, text: e.currentTarget.textContent || '' };
                            updateSlide(activeSlide, { stickies: newStickies });
                          }}>{s.text}</p>
                        <div className="flex items-center justify-between mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => voteSticky(s.id)} className="flex items-center gap-0.5 text-gray-500 hover:text-gray-700 text-[9px]">
                            <ThumbsUp className="w-2.5 h-2.5" />
                            {s.votes > 0 && <span>{s.votes}</span>}
                          </button>
                          <button onClick={() => deleteSticky(s.id)} className="text-gray-400 hover:text-red-500">
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ═══ FLOATING ACTION BAR — bottom of slide area ═══ */}
            <div className="absolute bottom-0 left-0 right-0 z-20">
              <div className="max-w-[1200px] mx-auto px-4 pb-3">
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg backdrop-blur-md"
                  style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.08)' }}>
                  {/* Add Sticky */}
                  <button onClick={() => setAddingSticky(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors">
                    <StickyNote className="w-3.5 h-3.5" />
                    Sticky {current.stickies.length > 0 ? `(${current.stickies.length})` : ''}
                  </button>

                  {/* Add Note */}
                  <button onClick={() => setAddingNote(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Note {current.notes.length > 0 ? `(${current.notes.length})` : ''}
                  </button>

                  {/* Record */}
                  {isRecording ? (
                    <button onClick={stopRecording}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 animate-pulse">
                      <Square className="w-3.5 h-3.5" />
                      {Math.floor(recordTime / 60)}:{String(recordTime % 60).padStart(2, '0')}
                    </button>
                  ) : (
                    <button onClick={startRecording}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors">
                      <Mic className="w-3.5 h-3.5" /> Record
                    </button>
                  )}

                  {/* Upload */}
                  <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer">
                    <Upload className="w-3.5 h-3.5" /> Upload
                    <input type="file" className="hidden" multiple onChange={(e) => handleUpload(e.target.files)} />
                  </label>

                  {/* AI Insights */}
                  <button onClick={generateInsights} disabled={aiLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 disabled:opacity-50 transition-colors">
                    {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {aiLoading ? 'Thinking...' : 'AI Insights'}
                  </button>

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Notes count + uploads count */}
                  {current.uploads.length > 0 && (
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                      <FileText className="w-3 h-3" /> {current.uploads.length} file{current.uploads.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ═══ STICKY INPUT POPUP ═══ */}
            {addingSticky && (
              <div className="absolute inset-0 z-30 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
                <div className="bg-white rounded-xl shadow-2xl p-4 w-[320px]">
                  <div className="flex items-center gap-2 mb-3">
                    <StickyNote className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-semibold text-gray-900">Add Sticky Note</span>
                  </div>
                  <textarea value={newStickyText} onChange={(e) => setNewStickyText(e.target.value)}
                    placeholder="Type your sticky note..."
                    className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg p-3 outline-none focus:border-teal-400 resize-none text-gray-800 placeholder:text-gray-400"
                    rows={3} autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addSticky(); } }} />
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex gap-1.5">
                      {STICKY_COLORS.map((c, i) => (
                        <button key={i} onClick={() => setNewStickyColor(i)}
                          className={`w-6 h-6 rounded-full border-2 transition-all ${i === newStickyColor ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                          style={{ backgroundColor: c.bg }} />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setAddingSticky(false); setNewStickyText(''); }}
                        className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1">Cancel</button>
                      <button onClick={addSticky}
                        className="text-sm bg-[#0FB5AD] text-white px-4 py-1.5 rounded-lg hover:bg-[#0a867f] font-medium">Add</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ NOTE INPUT POPUP ═══ */}
            {addingNote && (
              <div className="absolute inset-0 z-30 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
                <div className="bg-white rounded-xl shadow-2xl p-4 w-[360px]">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-semibold text-gray-900">Add Note</span>
                  </div>
                  <textarea value={newNoteText} onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="Add a note or observation..."
                    className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg p-3 outline-none focus:border-teal-400 resize-none text-gray-800 placeholder:text-gray-400"
                    rows={3} autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addNote(); } }} />
                  {/* Show existing notes */}
                  {current.notes.length > 0 && (
                    <div className="mt-3 max-h-[120px] overflow-y-auto space-y-1.5">
                      <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Existing notes</div>
                      {current.notes.map(n => (
                        <div key={n.id} className="flex items-start justify-between bg-gray-50 rounded-lg px-3 py-2 group">
                          <p className="text-xs text-gray-600 flex-1">{n.text}</p>
                          <button onClick={() => deleteNote(n.id)}
                            className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 ml-2">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-end gap-2 mt-3">
                    <button onClick={() => { setAddingNote(false); setNewNoteText(''); }}
                      className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1">Cancel</button>
                    <button onClick={addNote}
                      className="text-sm bg-[#0FB5AD] text-white px-4 py-1.5 rounded-lg hover:bg-[#0a867f] font-medium">Add</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Copilot sidebar */}
      {copilotOpen && !isPresenterMode && (
        <div className="w-[280px] border-l border-white/[0.06] flex flex-col shrink-0 absolute right-0 top-0 bottom-0 z-20"
          style={{ background: '#0B1120' }}>
          <div className="px-3 py-2.5 bg-[#0B1120] text-white flex items-center gap-2 shrink-0">
            <Sparkles className="h-3 w-3 text-[#0FB5AD]" />
            <span className="text-[10px] font-semibold">Slide Copilot</span>
            <span className="text-[8px] text-white/40 ml-auto">Slide {activeSlide + 1}</span>
            <button onClick={() => setCopilotOpen(false)} className="p-0.5 text-white/40 hover:text-white"><X className="h-3 w-3" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
            {chatMessages.length === 0 && (
              <div className="space-y-1.5 py-2">
                <p className="text-[9px] text-white/30 text-center">Ask about this slide or add content</p>
                {[
                  'Add stickies for key observations',
                  'Summarize this slide\'s discussion points',
                  'What questions should we ask here?',
                  `Suggest action items for ${workshop.customerName}`,
                ].map((q, i) => (
                  <button key={i} onClick={() => setChatInput(q)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg bg-white/[0.04] text-[9px] text-white/50 hover:bg-white/[0.08] hover:text-white/70">{q}</button>
                ))}
              </div>
            )}
            {chatMessages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] px-2.5 py-1.5 rounded-xl text-[10px] leading-relaxed ${
                  m.role === 'user' ? 'bg-[#0FB5AD] text-white rounded-tr-sm' : 'bg-white/[0.06] text-white/70 rounded-tl-sm'
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
          <div className="px-2.5 py-2 border-t border-white/[0.06] shrink-0 flex gap-1">
            <input value={chatInput} onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCopilotChat()}
              placeholder="Ask about this slide..."
              className="flex-1 px-2.5 py-1 text-[9px] bg-white/[0.04] border border-white/[0.08] rounded text-white placeholder:text-white/25 focus:outline-none focus:border-[#0FB5AD]/40" />
            <button onClick={handleCopilotChat} disabled={!chatInput.trim() || chatThinking}
              className="p-1.5 rounded bg-[#0FB5AD] text-white disabled:opacity-40"><Send className="h-3 w-3" /></button>
          </div>
        </div>
      )}

      {/* Bottom bar — dark chrome */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-white/[0.06] text-xs"
        style={{ background: '#0B1120' }}>
        <button onClick={() => goTo(activeSlide - 1)} disabled={activeSlide === 0}
          className="flex items-center gap-1 text-white/40 hover:text-white/70 disabled:opacity-20">
          <ChevronLeft className="w-4 h-4" /> Prev
        </button>
        <div className="flex items-center gap-3">
          <span className="font-mono text-white/30">
            {activeSlide + 1} / {slides.length}
          </span>
          <div className="flex gap-1">
            {slides.map((_, i) => (
              <button key={i} onClick={() => goTo(i)}
                className={`w-2 h-2 rounded-full transition-all duration-300
                  ${i === activeSlide ? 'bg-[#0FB5AD] scale-125 shadow-[0_0_6px_rgba(15,181,173,0.5)]' : 'bg-white/15 hover:bg-white/30'}`}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCopilotOpen(o => !o)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors text-[10px] ${copilotOpen ? 'border-[#0FB5AD]/30 text-[#0FB5AD] bg-[#0FB5AD]/10' : 'border-white/10 text-white/40 hover:text-white/60'}`}>
            <Sparkles className="h-3 w-3" /> Copilot
          </button>
          <button onClick={() => goTo(activeSlide + 1)} disabled={activeSlide === slides.length - 1}
            className="flex items-center gap-1 text-white/40 hover:text-white/70 disabled:opacity-20">
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
