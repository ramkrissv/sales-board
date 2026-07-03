'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  Plus, Trash2, Pencil, Check, X, LayoutGrid,
  Sparkles, Loader2, ChevronDown, ChevronRight,
  Mic, Square, Upload, Camera, Send, ThumbsUp,
  Maximize2, Minimize2, StickyNote,
  FileText, Image, PenTool, Search,
  Eraser, Palette, MessageSquare, FolderOpen,
  Music, File, Video, Archive,
} from 'lucide-react';

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */
interface Sticky {
  id: string;
  text: string;
  color: string;
  votes: number;
  ts: number;
}

interface NoteAttachment {
  id: string;
  type: 'sticky' | 'text' | 'audio' | 'image' | 'file' | 'link';
  content: string;
  color?: string;
  url?: string;
  fileName?: string;
}

interface NoteItem {
  id: string;
  text: string;
  expanded?: boolean;
  attachments?: NoteAttachment[];
}

interface SectionItem {
  id: string;
  title: string;
  collapsed: boolean;
  children: NoteItem[];
}

interface MediaItem {
  id: string;
  name: string;
  type: 'image' | 'file' | 'audio';
  url?: string;
  size?: string;
  ts: number;
}

interface WhiteboardState {
  stickies: Sticky[];
  sections: SectionItem[];
  mediaItems: MediaItem[];
  canvasData?: string;
}

interface ChatMsg {
  role: 'user' | 'ai';
  text: string;
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

const PEN_COLORS = ['#0B1120', '#C8472E', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
const UPLOAD_ACCEPT = '.pdf,.doc,.docx,.pptx,.txt,.md,.csv,.png,.jpg,.jpeg,.gif,.webp,.svg';

const TEMPLATE_SECTIONS = [
  'The Mandate', 'Engagement Layers', 'Operating Model',
  'Pain Points', 'Ecosystem', 'Architecture', 'Outcomes',
];

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */
interface Props { workshop: any; onRefresh: () => void; }

export default function WorkshopWhiteboard({ workshop, onRefresh }: Props) {
  const levels = workshop.framework?.levels || [];

  // Load saved state — may be in workshop.whiteboard directly or encoded in notes[0].text
  const loadSaved = (): WhiteboardState | null => {
    const wb = workshop.whiteboard;
    if (!wb) return null;
    // Try direct properties first
    if (wb.stickies && Array.isArray(wb.stickies)) return wb;
    // Try parsing from notes[0].text (save format)
    if (wb.notes && Array.isArray(wb.notes) && wb.notes.length > 0) {
      const firstNote = wb.notes[0];
      const text = firstNote?.text || firstNote?.content || '';
      if (text && text.startsWith('{')) {
        try { return JSON.parse(text); } catch {}
      }
    }
    // Try sections array directly (old format)
    if (wb.sections && Array.isArray(wb.sections) && wb.sections.length > 0) {
      return { stickies: [], sections: wb.sections.map((s: any) => ({ id: s.id || uid(), title: s.title || '', collapsed: s.collapsed ?? false, children: (s.children || []).map((c: any) => ({ id: c.id || uid(), text: c.text || c.content || '' })) })), mediaItems: [], canvasData: '' };
    }
    return null;
  };
  const saved = loadSaved();

  // --- Build initial state ---
  const buildInitialSections = useCallback((): SectionItem[] => {
    const secs: SectionItem[] = TEMPLATE_SECTIONS.map(t => ({
      id: uid(), title: t, collapsed: false, children: [],
    }));
    levels.forEach((l: any, i: number) => {
      secs.push({
        id: uid(),
        title: `${l.code || `L${i + 1}`}: ${l.name}`,
        collapsed: true,
        children: (l.dimensions || []).map((d: any) => ({
          id: uid(), text: `${d.name} — ${d.probe || 'assess this dimension'}`,
        })),
      });
    });
    return secs;
  }, []);

  // --- State ---
  const [stickies, setStickies] = useState<Sticky[]>(saved?.stickies || []);
  const [sections, setSections] = useState<SectionItem[]>(
    (saved?.sections || buildInitialSections()).map((s: any) => ({ ...s, children: s.children || [] }))
  );
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(saved?.mediaItems || []);
  const [canvasData, setCanvasData] = useState<string>(saved?.canvasData || '');

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Sticky state
  const [addingSticky, setAddingSticky] = useState(false);
  const [arranging, setArranging] = useState(false);
  const [arrangePlan, setArrangePlan] = useState<any>(null); // { moves, newSections, keepOnWall }

  // Arrange stickies into sections via AI
  const handleArrangeStickies = async () => {
    if (stickies.length === 0) return;
    setArranging(true);
    try {
      const stickyList = stickies.map(s => `[${s.id}] ${s.text}`).join('\n');
      const sectionList = sections.map(s => `[${s.id}] ${s.title}`).join('\n');

      const result = await chatMutation.mutateAsync({
        message: `Organize these sticky notes into the appropriate sections. If a sticky doesn't fit any existing section, suggest a NEW section to create.

STICKIES:
${stickyList}

EXISTING SECTIONS:
${sectionList}

Return ONLY JSON:
{
  "moves": [{"stickyId":"<id>","toSectionId":"<existing section id>","noteText":"<sticky text>"}],
  "newSections": [{"title":"<new section name>","stickyIds":["<id1>","<id2>"]}],
  "keepOnWall": ["<sticky id that doesn't fit anywhere>"]
}

Be precise — only move stickies that clearly belong to a section. Keep ambiguous ones on the wall.`,
        context: { page: 'workshop-whiteboard' },
      });

      const match = result.response.match(/\{[\s\S]*\}/);
      if (match) {
        const plan = JSON.parse(match[0]);
        const moves = plan.moves || [];
        const newSecs = plan.newSections || [];
        const keepIds = new Set(plan.keepOnWall || []);

        // Show in-app plan (not browser confirm)
        setArrangePlan({ moves, newSections: newSecs, keepOnWall: [...keepIds] });
      }
    } catch {}
    setArranging(false);
  };

  // Execute the arrange plan (called from in-app confirmation)
  const executeArrangePlan = () => {
    if (!arrangePlan) return;
    const { moves, newSections: newSecs, keepOnWall } = arrangePlan;
    const keepIds = new Set(keepOnWall || []);

    // Create new sections
    for (const ns of (newSecs || [])) {
      const childNotes = (ns.stickyIds || []).map((sid: string) => {
        const sticky = stickies.find(s => s.id === sid);
        return sticky ? { id: uid(), text: sticky.text } : null;
      }).filter(Boolean);
      setSections(prev => [...prev, { id: uid(), title: ns.title, collapsed: false, children: childNotes }]);
    }

    // Move stickies to existing sections
    for (const mv of (moves || [])) {
      setSections(prev => prev.map(s =>
        s.id === mv.toSectionId
          ? { ...s, children: [...(s.children || []), { id: uid(), text: mv.noteText }] }
          : s
      ));
    }

    // Remove moved stickies from wall
    const movedIds = new Set([
      ...(moves || []).map((m: any) => m.stickyId),
      ...(newSecs || []).flatMap((ns: any) => ns.stickyIds || []),
    ]);
    setStickies(prev => prev.filter(s => keepIds.has(s.id) || !movedIds.has(s.id)));

    setArrangePlan(null);
    setTimeout(() => persist(), 500);
  };
  const [newStickyText, setNewStickyText] = useState('');
  const [newStickyColor, setNewStickyColor] = useState(0);
  const [editingStickyId, setEditingStickyId] = useState<string | null>(null);
  const [editStickyText, setEditStickyText] = useState('');

  // Notes state
  const [addingNoteTo, setAddingNoteTo] = useState<string | null>(null);
  const [newNoteText, setNewNoteText] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState('');
  const [addingSection, setAddingSection] = useState(false);
  const [fullscreenSectionId, setFullscreenSectionId] = useState<string | null>(null);
  const [expandedEditor, setExpandedEditor] = useState<{ sectionId: string; noteId: string; attId: string; content: string } | null>(null);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [extractingSections, setExtractingSections] = useState(false);

  // Upload doc → server-side parse → AI structures into sections
  const handleDocSectionExtract = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setExtractingSections(true);

    let allExtractedText = '';
    const fileNames: string[] = [];

    // Parse each file server-side (handles PPTX, DOCX, PDF properly)
    for (const file of Array.from(files)) {
      fileNames.push(file.name);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const parseRes = await fetch('/api/parse-doc', { method: 'POST', body: formData });
        if (parseRes.ok) {
          const parsed = await parseRes.json();
          allExtractedText += `\n\n[${parsed.fileName}]${parsed.slideCount ? ` (${parsed.slideCount} slides)` : ''}:\n${parsed.text}\n`;
        } else {
          allExtractedText += `\n[${file.name}]: Could not parse\n`;
        }
      } catch {
        allExtractedText += `\n[${file.name}]: Parse error\n`;
      }
      // Also upload to S3 + media gallery
      handleFileUpload(files);
    }

    try {
      const result = await chatMutation.mutateAsync({
        message: `Create a structured workshop outline from this ACTUAL DOCUMENT CONTENT for ${workshop.customerName}. Return JSON array of sections with sub-items.

EXTRACTED DOCUMENT CONTENT:
${allExtractedText.slice(0, 6000)}

IMPORTANT: Use the ACTUAL TEXT from the documents above. Create sections that reflect what's IN the documents — slide titles, agenda items, key topics, pain points, architecture elements, etc.

Return ONLY JSON: [{"title":"<section from document>","children":["<specific item from document content>"]}]

Create 5-10 sections based on the actual document structure and content.`,
        context: { page: 'workshop-create' },
      });
      const match = result.response.match(/\[[\s\S]*\]/);
      if (match) {
        const extracted = JSON.parse(match[0]);
        const newSections: SectionItem[] = extracted.map((s: any) => ({
          id: uid(),
          title: s.title || 'Untitled',
          collapsed: false,
          children: (s.children || []).map((c: string) => ({ id: uid(), text: c })),
        }));
        // Ask user: Replace, Merge, or Add alongside?
        const hasContent = sections.some(s => (s.children?.length || 0) > 0);
        let action: 'replace' | 'merge' | 'add' = 'replace';

        if (hasContent) {
          const choice = window.confirm(
            `You have existing sections with content.\n\nClick OK to MERGE (add extracted items into matching sections).\nClick Cancel to REPLACE all sections with the new ones.`
          );
          action = choice ? 'merge' : 'replace';
        }

        if (action === 'merge') {
          setSections(prev => {
            const updated = [...prev];
            newSections.forEach(ns => {
              const match = updated.find(s =>
                s.title.toLowerCase().includes(ns.title.toLowerCase().split(' ')[0]) ||
                ns.title.toLowerCase().includes(s.title.toLowerCase().split(' ')[0])
              );
              if (match) {
                match.children = [...(match.children || []), ...(ns.children || [])];
                match.collapsed = false;
              } else {
                updated.push(ns);
              }
            });
            return updated;
          });
        } else {
          setSections(newSections);
        }
      }
    } catch {}
    setExtractingSections(false);
  };

  // Sketch state
  const [penColor, setPenColor] = useState('#0B1120');
  const [penWidth, setPenWidth] = useState(2);
  const [isEraser, setIsEraser] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Media state
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<any>(null);

  // AI Chat state
  const [chatOpen, setChatOpen] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatThinking, setChatThinking] = useState(false);

  const chatMutation = trpc.ai.chat.useMutation();
  const saveWb = trpc.workshop.saveWhiteboard.useMutation();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const saveRef = useRef<any>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  // Keep refs to latest state for save
  const stickiesRef = useRef(stickies);
  const sectionsRef = useRef(sections);
  const mediaRef2 = useRef(mediaItems);
  useEffect(() => { stickiesRef.current = stickies; }, [stickies]);
  useEffect(() => { sectionsRef.current = sections; }, [sections]);
  useEffect(() => { mediaRef2.current = mediaItems; }, [mediaItems]);

  // --- Auto-save (2s debounce) — uses refs for fresh state ---
  const persist = useCallback(() => {
    if (saveRef.current) clearTimeout(saveRef.current);
    saveRef.current = setTimeout(() => {
      const canvas = canvasRef.current;
      const cData = canvas ? canvas.toDataURL() : canvasData;
      saveWb.mutate({
        workshopId: workshop.id,
        stickies: stickiesRef.current as any,
        sections: sectionsRef.current as any,
        mediaItems: mediaRef2.current as any,
        canvasData: cData,
      });
    }, 2000);
  }, [workshop.id, stickies, sections, mediaItems, canvasData]);

  useEffect(() => { persist(); }, [stickies, sections, mediaItems]);

  // --- Sticky helpers ---
  const addSticky = () => {
    if (!newStickyText.trim()) return;
    setStickies(prev => [...prev, {
      id: uid(), text: newStickyText.trim(),
      color: STICKY_COLORS[newStickyColor].bg, votes: 0, ts: Date.now(),
    }]);
    setNewStickyText('');
    setAddingSticky(false);
  };

  const deleteSticky = (id: string) => setStickies(prev => prev.filter(s => s.id !== id));
  const voteSticky = (id: string) => setStickies(prev => prev.map(s => s.id === id ? { ...s, votes: s.votes + 1 } : s));
  const saveEditSticky = (id: string) => {
    setStickies(prev => prev.map(s => s.id === id ? { ...s, text: editStickyText } : s));
    setEditingStickyId(null);
  };

  // --- Section helpers ---
  const toggleSection = (id: string) => setSections(prev =>
    prev.map(s => s.id === id ? { ...s, collapsed: !s.collapsed } : s));

  const addNoteToSection = (sectionId: string) => {
    if (!newNoteText.trim()) return;
    setSections(prev => prev.map(s => s.id === sectionId
      ? { ...s, children: [...s.children, { id: uid(), text: newNoteText.trim() }] }
      : s));
    setNewNoteText('');
    setAddingNoteTo(null);
  };

  const deleteNote = (sectionId: string, noteId: string) => setSections(prev =>
    prev.map(s => s.id === sectionId ? { ...s, children: s.children.filter(n => n.id !== noteId) } : s));

  const saveEditNote = (sectionId: string, noteId: string) => {
    setSections(prev => prev.map(s => s.id === sectionId
      ? { ...s, children: s.children.map(n => n.id === noteId ? { ...n, text: editNoteText } : n) }
      : s));
    setEditingNoteId(null);
  };

  const addSection = () => {
    if (!newSectionTitle.trim()) return;
    setSections(prev => [...prev, { id: uid(), title: newSectionTitle.trim(), collapsed: false, children: [] }]);
    setNewSectionTitle('');
    setAddingSection(false);
  };

  const deleteSection = (id: string) => setSections(prev => prev.filter(s => s.id !== id));

  // Toggle note expanded
  const toggleNoteExpand = (sectionId: string, noteId: string) => setSections(prev =>
    prev.map(s => s.id === sectionId ? { ...s, children: s.children.map(n => n.id === noteId ? { ...n, expanded: !n.expanded } : n) } : s));

  // Add attachment to a note
  const addAttachment = (sectionId: string, noteId: string, att: NoteAttachment) => setSections(prev =>
    prev.map(s => s.id === sectionId ? { ...s, children: s.children.map(n => n.id === noteId ? { ...n, attachments: [...(n.attachments || []), att] } : n) } : s));

  const deleteAttachment = (sectionId: string, noteId: string, attId: string) => setSections(prev =>
    prev.map(s => s.id === sectionId ? { ...s, children: s.children.map(n => n.id === noteId ? { ...n, attachments: (n.attachments || []).filter(a => a.id !== attId) } : n) } : s));

  // File upload into a specific note
  const handleNoteFileUpload = (files: FileList | null, sectionId: string, noteId: string) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      const isImage = file.type.startsWith('image/');
      if (isImage) {
        const reader = new FileReader();
        reader.onload = () => addAttachment(sectionId, noteId, { id: uid(), type: 'image', content: file.name, url: reader.result as string, fileName: file.name });
        reader.readAsDataURL(file);
      } else {
        addAttachment(sectionId, noteId, { id: uid(), type: 'file', content: `${file.name} (${(file.size/1024).toFixed(0)} KB)`, fileName: file.name });
      }
    });
  };

  // --- Canvas drawing ---
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    // Draw dot grid
    ctx.fillStyle = '#E4E7EE';
    for (let x = 0; x < canvas.width; x += 20) {
      for (let y = 0; y < canvas.height; y += 20) {
        ctx.beginPath();
        ctx.arc(x, y, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Restore saved canvas
    if (canvasData) {
      const img = new window.Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = canvasData;
    }
  }, [canvasData]);

  useEffect(() => { initCanvas(); }, [initCanvas]);

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getCanvasPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.strokeStyle = isEraser ? '#F5F6F9' : penColor;
    ctx.lineWidth = isEraser ? penWidth * 4 : penWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getCanvasPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const endDraw = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) setCanvasData(canvas.toDataURL());
    persist();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#E4E7EE';
    for (let x = 0; x < canvas.width; x += 20) {
      for (let y = 0; y < canvas.height; y += 20) {
        ctx.beginPath();
        ctx.arc(x, y, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    setCanvasData('');
    persist();
  };

  // --- Media / upload (S3-backed) ---
  const uploadToS3 = async (file: File): Promise<{ url: string; key: string } | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', 'workshop');
      formData.append('entityId', workshop.id);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        return { url: data.url, key: data.key };
      }
    } catch {}
    return null;
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(async (file) => {
      const isImage = file.type.startsWith('image/');
      const sizeStr = file.size < 1024 * 1024
        ? `${(file.size / 1024).toFixed(0)} KB`
        : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

      // Upload to S3
      const s3Result = await uploadToS3(file);

      if (isImage) {
        if (s3Result) {
          // Use S3 URL (persistent)
          setMediaItems(prev => [...prev, { id: uid(), name: file.name, type: 'image', url: s3Result.url, size: sizeStr, ts: Date.now() }]);
        } else {
          // Fallback to base64 data URL (works offline but bloats MongoDB)
          const reader = new FileReader();
          reader.onload = () => { setMediaItems(prev => [...prev, { id: uid(), name: file.name, type: 'image', url: reader.result as string, size: sizeStr, ts: Date.now() }]); };
          reader.readAsDataURL(file);
        }
      } else {
        setMediaItems(prev => [...prev, { id: uid(), name: file.name, type: 'file', url: s3Result?.url, size: sizeStr, ts: Date.now() }]);
      }
    });
  };

  const handleCamera = async (file: File) => {
    const s3Result = await uploadToS3(file);
    if (s3Result) {
      setMediaItems(prev => [...prev, { id: uid(), name: file.name, type: 'image', url: s3Result.url, size: `${(file.size/1024).toFixed(0)} KB`, ts: Date.now() }]);
      return;
    }
    // Fallback
    const reader = new FileReader();
    reader.onload = () => {
      setMediaItems(prev => [...prev, {
        id: uid(), name: file.name, type: 'image',
        url: reader.result as string, size: `${(file.size / 1024).toFixed(0)} KB`, ts: Date.now(),
      }]);
    };
    reader.readAsDataURL(file);
  };

  const deleteMedia = (id: string) => setMediaItems(prev => prev.filter(m => m.id !== id));

  // --- Audio recording (uploads to S3) ---
  const audioChunksRef = useRef<Blob[]>([]);
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
        const fileName = `voice-${Date.now().toString(36)}.webm`;

        // Upload audio to S3
        const audioFile = new window.File([audioBlob], fileName, { type: 'audio/webm' });
        const s3Result = await uploadToS3(audioFile);

        const mediaId = uid();
        setMediaItems(prev => [...prev, {
          id: mediaId, name: `Voice note (${duration})`,
          type: 'audio', url: s3Result?.url, size: `${(audioBlob.size / 1024).toFixed(0)} KB`, ts: Date.now(),
        }]);

        // Real transcription via Whisper/Deepgram, fallback to AI summary
        try {
          const transcribeForm = new FormData();
          const audioFileForSTT = new window.File([audioBlob], fileName, { type: 'audio/webm' });
          transcribeForm.append('file', audioFileForSTT);
          transcribeForm.append('context', `${workshop.customerName} workshop: ${sections.map(s => s.title).join(', ')}`);

          const sttRes = await fetch('/api/transcribe', { method: 'POST', body: transcribeForm });
          const sttData = await sttRes.json();

          let transcription = sttData.text;
          const source = sttData.source;

          // If no real STT, use AI to generate summary
          if (!transcription && source === 'none') {
            const aiResult = await chatMutation.mutateAsync({
              message: `A ${duration} voice recording was captured during ${workshop.customerName}'s workshop. Generate likely key points as bullet points.\n\nContext: ${sections.map(s => s.title).join(', ')}`,
              context: { page: 'workshop-whiteboard' },
            });
            transcription = aiResult.response;
          }

          if (transcription) {
            setStickies(prev => [...prev, {
              id: uid(), text: `🎙 ${source === 'whisper' || source === 'deepgram' ? 'Transcription' : 'AI Summary'} (${duration}):\n${transcription.slice(0, 500)}`,
              color: STICKY_COLORS[1].bg, votes: 0, ts: Date.now(),
            }]);
            setMediaItems(prev => prev.map(m => m.id === mediaId ? { ...m, name: `Voice (${duration}) — ${source === 'none' ? 'AI summary' : 'transcribed'}` } : m));
          }
        } catch { /* transcription failed — audio still saved */ }
      };
      rec.start();
      mediaRecRef.current = rec;
      setIsRecording(true);
      setRecordTime(0);
      timerRef.current = setInterval(() => setRecordTime(t => t + 1), 1000);
    } catch { /* microphone not available */ }
  };

  const stopRecording = () => {
    mediaRecRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // --- AI Chat ---
  const handleChat = async () => {
    if (!chatInput.trim() || chatThinking) return;
    const msg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: msg }]);
    setChatThinking(true);
    let actionsPerformed = 0;
    try {
      const stickyTexts = stickies.map(s => `[${s.id}] ${s.text}`).join('\n- ');
      const sectionSummary = sections.map(s =>
        `[${s.id}] ${s.title}: ${(s.children || []).map(c => `[${c.id}] ${c.text}`).join('; ')}`
      ).join('\n');
      const result = await chatMutation.mutateAsync({
        message: `Workshop whiteboard copilot for ${workshop.customerName}. You can perform ALL actions.

CURRENT STATE:
Stickies (${stickies.length}):
- ${stickyTexts || '(none)'}

Sections (${sections.length}):
${sectionSummary || '(empty)'}

USER REQUEST: ${msg}

AVAILABLE ACTIONS (use these tags in your response — multiple actions allowed):

[STICKY: color=yellow|blue|green|pink|purple|orange text=<content>] — Create a sticky note
[NOTE: section=<section title> text=<content>] — Add note to a section (creates section if not found)
[SECTION: title=<new section title>] — Create a new section
[MOVE: noteId=<id> toSection=<section title>] — Move a note to a different section
[DELETE_STICKY: id=<sticky id>] — Delete a sticky
[DELETE_NOTE: sectionId=<section id> noteId=<note id>] — Delete a note from a section
[DELETE_SECTION: id=<section id>] — Delete an entire section
[ORGANIZE] — Reorganize all stickies into appropriate sections based on content

Always execute the user's request. If they ask to create content, create it. If they ask to organize, organize. If they ask to delete, delete. Respond with a brief confirmation of what you did.`,
        context: { page: 'workshop-whiteboard' },
      });
      const resp = result.response;

      // Parse and execute ALL action tags
      // 1. Create stickies
      for (const m of resp.matchAll(/\[STICKY:\s*color=(\w+)\s+text=([^\]]+)\]/g)) {
        const colorMap: Record<string, number> = { yellow: 0, blue: 1, green: 2, pink: 3, purple: 4, orange: 5 };
        setStickies(prev => [...prev, { id: uid(), text: m[2].trim(), color: STICKY_COLORS[colorMap[m[1].toLowerCase()] ?? 0].bg, votes: 0, ts: Date.now() }]);
        actionsPerformed++;
      }

      // 2. Create notes in sections
      for (const m of resp.matchAll(/\[NOTE:\s*section=([^\]]*?)\s+text=([^\]]+)\]/g)) {
        const secTitle = m[1].trim();
        const noteText = m[2].trim();
        setSections(prev => {
          const target = prev.find(s => s.title.toLowerCase().includes(secTitle.toLowerCase()));
          if (target) return prev.map(s => s.id === target.id ? { ...s, children: [...(s.children || []), { id: uid(), text: noteText }] } : s);
          return [...prev, { id: uid(), title: secTitle, collapsed: false, children: [{ id: uid(), text: noteText }] }];
        });
        actionsPerformed++;
      }

      // 3. Create sections
      for (const m of resp.matchAll(/\[SECTION:\s*title=([^\]]+)\]/g)) {
        setSections(prev => [...prev, { id: uid(), title: m[1].trim(), collapsed: false, children: [] }]);
        actionsPerformed++;
      }

      // 4. Move notes between sections
      for (const m of resp.matchAll(/\[MOVE:\s*noteId=(\S+)\s+toSection=([^\]]+)\]/g)) {
        const noteId = m[1].trim();
        const toSecTitle = m[2].trim();
        setSections(prev => {
          let noteObj: NoteItem | null = null;
          const withoutNote = prev.map(s => {
            const found = (s.children || []).find(c => c.id === noteId);
            if (found) noteObj = found;
            return { ...s, children: (s.children || []).filter(c => c.id !== noteId) };
          });
          if (!noteObj) return prev;
          const target = withoutNote.find(s => s.title.toLowerCase().includes(toSecTitle.toLowerCase()));
          if (target) return withoutNote.map(s => s.id === target.id ? { ...s, children: [...(s.children || []), noteObj!] } : s);
          return withoutNote;
        });
        actionsPerformed++;
      }

      // 5. Delete stickies
      for (const m of resp.matchAll(/\[DELETE_STICKY:\s*id=(\S+)\]/g)) {
        setStickies(prev => prev.filter(s => s.id !== m[1].trim()));
        actionsPerformed++;
      }

      // 6. Delete notes
      for (const m of resp.matchAll(/\[DELETE_NOTE:\s*sectionId=(\S+)\s+noteId=(\S+)\]/g)) {
        setSections(prev => prev.map(s => s.id === m[1].trim() ? { ...s, children: (s.children || []).filter(c => c.id !== m[2].trim()) } : s));
        actionsPerformed++;
      }

      // 7. Delete sections
      for (const m of resp.matchAll(/\[DELETE_SECTION:\s*id=(\S+)\]/g)) {
        setSections(prev => prev.filter(s => s.id !== m[1].trim()));
        actionsPerformed++;
      }

      // 8. Organize — move stickies into matching sections
      if (resp.includes('[ORGANIZE]')) {
        // Move each sticky into the best-matching section based on content
        const stickyToMove = [...stickies];
        for (const sticky of stickyToMove) {
          const bestSection = sections.find(s =>
            sticky.text.toLowerCase().includes(s.title.toLowerCase().split(' ')[0]) ||
            s.title.toLowerCase().includes(sticky.text.toLowerCase().split(' ')[0])
          );
          if (bestSection) {
            setSections(prev => prev.map(s => s.id === bestSection.id ? { ...s, children: [...(s.children || []), { id: uid(), text: sticky.text }] } : s));
            setStickies(prev => prev.filter(s => s.id !== sticky.id));
            actionsPerformed++;
          }
        }
      }

      // Auto-save after actions
      if (actionsPerformed > 0) {
        setTimeout(() => persist(), 500);
      }

      // Clean response text (remove action tags)
      const clean = resp
        .replace(/\[STICKY:[^\]]+\]/g, '').replace(/\[NOTE:[^\]]+\]/g, '')
        .replace(/\[SECTION:[^\]]+\]/g, '').replace(/\[MOVE:[^\]]+\]/g, '')
        .replace(/\[DELETE_STICKY:[^\]]+\]/g, '').replace(/\[DELETE_NOTE:[^\]]+\]/g, '')
        .replace(/\[DELETE_SECTION:[^\]]+\]/g, '').replace(/\[ORGANIZE\]/g, '')
        .trim();
      const actionMsg = actionsPerformed > 0 ? `(${actionsPerformed} action${actionsPerformed > 1 ? 's' : ''} performed)\n\n` : '';
      if (clean || actionsPerformed > 0) setChatMessages(prev => [...prev, { role: 'ai', text: actionMsg + clean }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'ai', text: 'Error processing request. Please try again.' }]);
    }
    setChatThinking(false);
  };

  // --- Search ---
  const q = searchQuery.toLowerCase();
  const filteredStickies = q ? stickies.filter(s => s.text.toLowerCase().includes(q)) : stickies;
  const filteredSections = q
    ? sections.map(s => ({
        ...s,
        children: s.children.filter(c => c.text.toLowerCase().includes(q)),
      })).filter(s => s.title.toLowerCase().includes(q) || (s.children?.length || 0) > 0)
    : sections;
  const filteredMedia = q ? mediaItems.filter(m => m.name.toLowerCase().includes(q)) : mediaItems;

  // --- Stats ---
  const totalNotes = sections.reduce((sum, s) => sum + (s.children?.length || 0), 0);

  // --- File type icon ---
  const fileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return Image;
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return Music;
    if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) return Video;
    if (['zip', 'tar', 'gz', '7z', 'rar'].includes(ext)) return Archive;
    return File;
  };

  // --- Sticky rotation based on id ---
  const stickyRotation = (id: string) => {
    const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return ((hash % 30) - 15) / 10; // -1.5 to 1.5 degrees
  };

  const stickyBorder = (bgColor: string) =>
    STICKY_COLORS.find(c => c.bg === bgColor)?.border || '#F59E0B';

  /* ═══════════════════════════════════════
     RENDER
     ═══════════════════════════════════════ */
  return (
    <div className={`flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : 'min-h-[600px]'}`}>
      {/* ── Header toolbar ── */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-card rounded-t-xl flex-wrap shrink-0">
        <LayoutGrid className="h-4 w-4 text-[#f59e0b]" />
        <span className="text-xs font-semibold text-foreground">Discovery Workspace</span>
        <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#f59e0b]/10 text-[#f59e0b] font-medium">
          {stickies.length} stickies · {totalNotes} notes · {mediaItems.length} files
        </span>
        {/* Save button — always visible, prominent */}
        <button onClick={() => persist()}
          className={`flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-medium rounded-lg transition-colors ${
            saveWb.isPending ? 'bg-[#0FB5AD]/20 text-[#0FB5AD] border border-[#0FB5AD]/30' :
            saveWb.isSuccess ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
            'bg-[#0FB5AD] text-white hover:bg-[#0a867f]'
          }`}>
          {saveWb.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : saveWb.isSuccess ? <Check className="h-3 w-3" /> : <Check className="h-3 w-3" />}
          {saveWb.isPending ? 'Saving...' : saveWb.isSuccess ? 'Saved' : 'Save All'}
        </button>
        <div className="flex-1" />
        <div className="relative">
          <Search className="h-3 w-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search all zones..."
            className="pl-7 pr-2 py-1 text-[10px] bg-secondary/30 border border-border rounded-lg text-foreground w-44 focus:outline-none focus:border-[#f59e0b]/40"
          />
        </div>
        <button
          onClick={() => setChatOpen(o => !o)}
          className={`p-1.5 rounded-lg border border-border ${chatOpen ? 'text-[#0FB5AD] bg-[#0FB5AD]/10' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => setIsFullscreen(f => !f)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground">
          {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* ── Main layout ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: 4 zones stacked ── */}
        <div className="flex-1 overflow-y-auto">
          {/* ╔══════════════════════════════════════╗
             ║  ZONE 1: STICKY WALL                 ║
             ╚══════════════════════════════════════╝ */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2 mb-3">
              <StickyNote className="h-4 w-4 text-[#f59e0b]" />
              <span className="text-xs font-semibold text-foreground">Sticky Wall</span>
              <span className="text-[9px] text-muted-foreground">{filteredStickies.length} notes</span>
              <div className="flex-1" />
              {stickies.length >= 2 && (
                <button onClick={handleArrangeStickies} disabled={arranging}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[10px] rounded-lg border transition-colors ${arranging ? 'border-[#7c3aed]/30 text-[#7c3aed]' : 'border-border text-muted-foreground hover:text-[#7c3aed] hover:border-[#7c3aed]/30'}`}>
                  {arranging ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  {arranging ? 'Arranging...' : 'Arrange into Sections'}
                </button>
              )}
              <button
                onClick={() => setAddingSticky(true)}
                className="flex items-center gap-1 px-2.5 py-1 text-[10px] rounded-lg bg-[#f59e0b] text-white hover:bg-[#d97706] transition-colors"
              >
                <Plus className="h-3 w-3" /> Add Sticky
              </button>
            </div>

            {/* Add sticky form */}
            {addingSticky && (
              <div className="mb-3 p-3 rounded-lg border border-border bg-muted/20">
                <div className="flex gap-1.5 mb-2">
                  {STICKY_COLORS.map((c, i) => (
                    <button
                      key={c.bg}
                      onClick={() => setNewStickyColor(i)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${newStickyColor === i ? 'border-foreground scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c.bg }}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <textarea
                    value={newStickyText}
                    onChange={e => setNewStickyText(e.target.value)}
                    autoFocus
                    rows={2}
                    placeholder="What did you observe?"
                    className="flex-1 px-2.5 py-1.5 text-[11px] bg-card border border-border rounded-lg text-foreground resize-none focus:outline-none focus:border-[#f59e0b]/50"
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addSticky(); } if (e.key === 'Escape') setAddingSticky(false); }}
                  />
                  <div className="flex flex-col gap-1 shrink-0">
                    <button onClick={addSticky} disabled={!newStickyText.trim()} className="px-3 py-1.5 text-[10px] rounded-lg bg-[#f59e0b] text-white disabled:opacity-40">Add</button>
                    <button onClick={() => setAddingSticky(false)} className="text-[9px] text-muted-foreground">Cancel</button>
                  </div>
                </div>
              </div>
            )}

            {/* Sticky grid */}
            <div className="flex flex-wrap gap-3">
              {filteredStickies.map(sticky => (
                <div
                  key={sticky.id}
                  className="group/sticky relative w-[180px] min-h-[100px] p-3 rounded cursor-default select-none"
                  style={{
                    backgroundColor: sticky.color,
                    boxShadow: `2px 3px 8px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.06)`,
                    transform: `rotate(${stickyRotation(sticky.id)}deg)`,
                    borderBottom: `3px solid ${stickyBorder(sticky.color)}`,
                    transition: 'transform 0.15s ease',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'rotate(0deg) scale(1.03)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = `rotate(${stickyRotation(sticky.id)}deg)`)}
                >
                  {/* Edit overlay on hover */}
                  <div className="absolute top-1.5 right-1.5 flex gap-0.5 opacity-0 group-hover/sticky:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditingStickyId(sticky.id); setEditStickyText(sticky.text); }}
                      className="p-1 rounded bg-black/10 hover:bg-black/20 text-gray-700"
                    >
                      <Pencil className="h-2.5 w-2.5" />
                    </button>
                    <button
                      onClick={() => deleteSticky(sticky.id)}
                      className="p-1 rounded bg-black/10 hover:bg-red-500/30 text-gray-700"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  </div>

                  {editingStickyId === sticky.id ? (
                    <div>
                      <textarea
                        value={editStickyText}
                        onChange={e => setEditStickyText(e.target.value)}
                        autoFocus
                        rows={3}
                        className="w-full bg-transparent border-none text-[11px] text-gray-800 resize-none focus:outline-none leading-relaxed"
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEditSticky(sticky.id); } if (e.key === 'Escape') setEditingStickyId(null); }}
                      />
                      <div className="flex gap-1 mt-1">
                        <button onClick={() => saveEditSticky(sticky.id)} className="p-0.5 text-emerald-700"><Check className="h-3 w-3" /></button>
                        <button onClick={() => setEditingStickyId(null)} className="p-0.5 text-gray-500"><X className="h-3 w-3" /></button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-gray-800 leading-relaxed whitespace-pre-wrap pr-6">{sticky.text}</p>
                  )}

                  {/* Vote */}
                  <div className="absolute bottom-1.5 left-2 flex items-center gap-1">
                    <button
                      onClick={() => voteSticky(sticky.id)}
                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black/5 hover:bg-black/10 text-gray-600 transition-colors"
                    >
                      <ThumbsUp className="h-2.5 w-2.5" />
                      {sticky.votes > 0 && <span className="text-[9px] font-semibold">{sticky.votes}</span>}
                    </button>
                  </div>
                </div>
              ))}

              {filteredStickies.length === 0 && !addingSticky && (
                <div className="w-full text-center py-6">
                  <StickyNote className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-[10px] text-muted-foreground">No stickies yet. Add your first observation.</p>
                </div>
              )}
            </div>

            {/* Arrange plan confirmation — in-app, not browser popup */}
            {arrangePlan && (
              <div className="mt-3 p-4 rounded-xl border-2 border-[#7c3aed]/30 bg-[#7c3aed]/5 space-y-3 animate-flow-in">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#7c3aed]" />
                  <span className="text-xs font-semibold text-foreground">AI Arrangement Plan</span>
                </div>

                {/* Moves to existing sections */}
                {(arrangePlan.moves || []).length > 0 && (
                  <div>
                    <div className="text-[10px] font-medium text-[#0FB5AD] mb-1">Move to existing sections ({arrangePlan.moves.length})</div>
                    <div className="space-y-1">
                      {arrangePlan.moves.map((mv: any, i: number) => {
                        const targetSec = sections.find(s => s.id === mv.toSectionId);
                        return (
                          <div key={i} className="flex items-center gap-2 text-[10px] px-2 py-1 rounded bg-card border border-border">
                            <span className="text-foreground truncate flex-1">{mv.noteText}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="text-[#0FB5AD] font-medium truncate">{targetSec?.title || mv.toSectionId}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* New sections to create */}
                {(arrangePlan.newSections || []).length > 0 && (
                  <div>
                    <div className="text-[10px] font-medium text-[#f59e0b] mb-1">Create new sections ({arrangePlan.newSections.length})</div>
                    {arrangePlan.newSections.map((ns: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-[10px] px-2 py-1 rounded bg-[#f59e0b]/5 border border-[#f59e0b]/20">
                        <Plus className="h-3 w-3 text-[#f59e0b]" />
                        <span className="font-medium text-foreground">{ns.title}</span>
                        <span className="text-muted-foreground">({(ns.stickyIds || []).length} stickies)</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Keep on wall */}
                {(arrangePlan.keepOnWall || []).length > 0 && (
                  <div className="text-[10px] text-muted-foreground">
                    {arrangePlan.keepOnWall.length} sticky{arrangePlan.keepOnWall.length > 1 ? ' notes' : ''} will stay on the wall (no matching section)
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button onClick={executeArrangePlan}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs rounded-lg bg-[#7c3aed] text-white hover:bg-[#6d28d9] transition-colors">
                    <Check className="h-3.5 w-3.5" /> Apply
                  </button>
                  <button onClick={() => setArrangePlan(null)}
                    className="px-4 py-2 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ╔══════════════════════════════════════╗
             ║  ZONE 2: NOTES & OUTLINE             ║
             ╚══════════════════════════════════════╝ */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2 mb-3">
              <FolderOpen className="h-4 w-4 text-[#3B82F6]" />
              <span className="text-xs font-semibold text-foreground">Notes &amp; Outline</span>
              <span className="text-[9px] text-muted-foreground">{filteredSections.length} sections · {totalNotes} notes</span>
              <div className="flex-1" />
              {/* Expand All / Collapse All */}
              <button onClick={() => setSections(prev => prev.map(s => ({ ...s, collapsed: false })))}
                className="text-[9px] text-muted-foreground hover:text-foreground transition-colors">Expand All</button>
              <span className="text-[9px] text-muted-foreground">|</span>
              <button onClick={() => setSections(prev => prev.map(s => ({ ...s, collapsed: true })))}
                className="text-[9px] text-muted-foreground hover:text-foreground transition-colors">Collapse All</button>
              <label className={`flex items-center gap-1 px-2.5 py-1 text-[10px] rounded-lg border border-border cursor-pointer transition-colors ${extractingSections ? 'text-[#3B82F6]' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'}`}>
                {extractingSections ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                {extractingSections ? 'Extracting...' : 'From Doc'}
                <input type="file" className="hidden" multiple accept={UPLOAD_ACCEPT} onChange={e => { handleDocSectionExtract(e.target.files); e.target.value = ''; }} />
              </label>
              <button
                onClick={() => setAddingSection(true)}
                className="flex items-center gap-1 px-2.5 py-1 text-[10px] rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors"
              >
                <Plus className="h-3 w-3" /> Section
              </button>
            </div>

            {addingSection && (
              <div className="mb-2 flex gap-2 p-2 rounded-lg border border-border bg-muted/20">
                <input
                  value={newSectionTitle}
                  onChange={e => setNewSectionTitle(e.target.value)}
                  autoFocus
                  placeholder="Section title..."
                  className="flex-1 px-2.5 py-1 text-[11px] bg-card border border-border rounded text-foreground focus:outline-none focus:border-[#3B82F6]/50"
                  onKeyDown={e => { if (e.key === 'Enter') addSection(); if (e.key === 'Escape') setAddingSection(false); }}
                />
                <button onClick={addSection} disabled={!newSectionTitle.trim()} className="px-2.5 py-1 text-[10px] rounded bg-[#3B82F6] text-white disabled:opacity-40">Add</button>
                <button onClick={() => setAddingSection(false)} className="text-[9px] text-muted-foreground px-1">Cancel</button>
              </div>
            )}

            <div className="space-y-0.5">
              {filteredSections.map(section => (
                <div key={section.id} className="group/sec">
                  {/* Section header */}
                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-muted/20 transition-colors">
                    <button onClick={() => toggleSection(section.id)} className="p-0.5 shrink-0">
                      {section.collapsed
                        ? <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
                    </button>
                    <span className="text-[11px] font-semibold text-foreground flex-1">{section.title}</span>
                    {section.children.length > 0 && (
                      <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{section.children.length}</span>
                    )}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover/sec:opacity-100 transition-opacity">
                      <button onClick={() => { setAddingNoteTo(section.id); setNewNoteText(''); }} className="p-0.5 text-muted-foreground hover:text-[#3B82F6]" title="Add note"><Plus className="h-3 w-3" /></button>
                      <label className="p-0.5 text-muted-foreground hover:text-[#10B981] cursor-pointer" title="Upload files">
                        <Upload className="h-3 w-3" />
                        <input type="file" className="hidden" multiple accept={UPLOAD_ACCEPT} onChange={e => handleFileUpload(e.target.files)} />
                      </label>
                      <button onClick={() => { setFullscreenSectionId(section.id); setSections(prev => prev.map(s => s.id === section.id ? { ...s, collapsed: false } : s)); }}
                        className="p-0.5 text-muted-foreground hover:text-foreground" title="Expand to full screen">
                        <Maximize2 className="h-3 w-3" />
                      </button>
                      <button onClick={() => deleteSection(section.id)} className="p-0.5 text-muted-foreground hover:text-red-400" title="Delete section"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </div>

                  {/* Children — each is an expandable area */}
                  {!section.collapsed && (
                    <div className="ml-4 border-l-2 border-border/30 pl-2 space-y-0.5 mt-1">
                      {(section.children || []).map(note => {
                        const atts = note.attachments || [];
                        const isExpanded = note.expanded;
                        return (
                        <div key={note.id} className="group/note rounded-lg hover:bg-muted/5 transition-colors">
                          {/* Note header — click to expand */}
                          <div className="flex items-center gap-1.5 px-2 py-1.5">
                            <button onClick={() => toggleNoteExpand(section.id, note.id)} className="p-0.5 shrink-0">
                              {isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                            </button>
                            {editingNoteId === note.id ? (
                              <div className="flex-1 flex gap-1">
                                <input value={editNoteText} onChange={e => setEditNoteText(e.target.value)} autoFocus
                                  className="flex-1 px-2 py-0.5 text-[10px] bg-card border border-border rounded text-foreground focus:outline-none"
                                  onKeyDown={e => { if (e.key === 'Enter') saveEditNote(section.id, note.id); if (e.key === 'Escape') setEditingNoteId(null); }} />
                                <button onClick={() => saveEditNote(section.id, note.id)} className="p-0.5 text-emerald-400"><Check className="h-3 w-3" /></button>
                                <button onClick={() => setEditingNoteId(null)} className="p-0.5 text-muted-foreground"><X className="h-3 w-3" /></button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-foreground leading-relaxed flex-1 cursor-pointer"
                                onClick={() => toggleNoteExpand(section.id, note.id)}>{note.text}</span>
                            )}
                            {atts.length > 0 && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-[#f59e0b]/10 text-[#f59e0b]">{atts.length}</span>}
                            <div className="flex items-center gap-0.5 opacity-0 group-hover/note:opacity-100 transition-opacity shrink-0">
                              <button onClick={() => { setEditingNoteId(note.id); setEditNoteText(note.text); }} className="p-0.5 text-muted-foreground hover:text-foreground"><Pencil className="h-2.5 w-2.5" /></button>
                              <button onClick={() => deleteNote(section.id, note.id)} className="p-0.5 text-muted-foreground hover:text-red-400"><Trash2 className="h-2.5 w-2.5" /></button>
                            </div>
                          </div>

                          {/* Expanded area — rich content canvas */}
                          {isExpanded && (
                            <div className="ml-7 mb-2 p-3 rounded-lg border border-border/50 bg-muted/5 space-y-2">
                              {/* Inline actions */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <button onClick={() => addAttachment(section.id, note.id, { id: uid(), type: 'sticky', content: 'New sticky', color: STICKY_COLORS[Math.floor(Math.random()*6)].bg })}
                                  className="flex items-center gap-1 px-2 py-1 text-[9px] rounded border border-border text-muted-foreground hover:text-[#f59e0b] hover:border-[#f59e0b]/30 transition-colors">
                                  <StickyNote className="h-2.5 w-2.5" /> Sticky
                                </button>
                                <button onClick={() => addAttachment(section.id, note.id, { id: uid(), type: 'text', content: '' })}
                                  className="flex items-center gap-1 px-2 py-1 text-[9px] rounded border border-border text-muted-foreground hover:text-[#3B82F6] hover:border-[#3B82F6]/30 transition-colors">
                                  <FileText className="h-2.5 w-2.5" /> Note
                                </button>
                                <label className="flex items-center gap-1 px-2 py-1 text-[9px] rounded border border-border text-muted-foreground hover:text-[#10B981] hover:border-[#10B981]/30 cursor-pointer transition-colors">
                                  <Upload className="h-2.5 w-2.5" /> Upload
                                  <input type="file" className="hidden" multiple accept={UPLOAD_ACCEPT} onChange={e => handleNoteFileUpload(e.target.files, section.id, note.id)} />
                                </label>
                                <label className="flex items-center gap-1 px-2 py-1 text-[9px] rounded border border-border text-muted-foreground hover:text-[#8B5CF6] hover:border-[#8B5CF6]/30 cursor-pointer transition-colors">
                                  <Camera className="h-2.5 w-2.5" /> Photo
                                  <input type="file" className="hidden" accept="image/*" capture="environment" onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => addAttachment(section.id, note.id, { id: uid(), type: 'image', content: f.name, url: r.result as string }); r.readAsDataURL(f); } }} />
                                </label>
                                <button onClick={() => addAttachment(section.id, note.id, { id: uid(), type: 'link', content: '' })}
                                  className="flex items-center gap-1 px-2 py-1 text-[9px] rounded border border-border text-muted-foreground hover:text-foreground transition-colors">
                                  <Search className="h-2.5 w-2.5" /> Link
                                </button>
                              </div>

                              {/* Attachments grid */}
                              {atts.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {atts.map(att => (
                                    <div key={att.id} className="group/att relative">
                                      {att.type === 'sticky' ? (
                                        <div className="w-[140px] min-h-[70px] p-2 rounded cursor-default"
                                          style={{ backgroundColor: att.color || '#FEF3C7', boxShadow: '1px 2px 4px rgba(0,0,0,0.1)', transform: `rotate(${(parseInt(att.id, 36) % 5 - 2) * 0.5}deg)` }}>
                                          <p className="text-[9px] text-gray-800 leading-relaxed whitespace-pre-wrap" contentEditable suppressContentEditableWarning
                                            onBlur={e => { const t = e.currentTarget.textContent || ''; setSections(prev => prev.map(s => s.id === section.id ? { ...s, children: s.children.map(n => n.id === note.id ? { ...n, attachments: (n.attachments || []).map(a => a.id === att.id ? { ...a, content: t } : a) } : n) } : s)); }}>
                                            {att.content}
                                          </p>
                                        </div>
                                      ) : att.type === 'image' && att.url ? (
                                        <img src={att.url} alt={att.content} className="h-20 rounded border border-border object-cover" />
                                      ) : att.type === 'text' ? (
                                        <div className="w-[280px] rounded-lg border border-border bg-card relative group/txt overflow-hidden">
                                          {/* Mini formatting bar */}
                                          <div className="flex items-center gap-0.5 px-2 py-1 border-b border-border/50 bg-muted/20 opacity-0 group-hover/txt:opacity-100 transition-opacity">
                                            <button onClick={() => document.execCommand('bold')} className="px-1.5 py-0.5 text-[8px] font-bold text-muted-foreground hover:text-foreground rounded hover:bg-muted/50">B</button>
                                            <button onClick={() => document.execCommand('italic')} className="px-1.5 py-0.5 text-[8px] italic text-muted-foreground hover:text-foreground rounded hover:bg-muted/50">I</button>
                                            <button onClick={() => document.execCommand('insertUnorderedList')} className="px-1.5 py-0.5 text-[8px] text-muted-foreground hover:text-foreground rounded hover:bg-muted/50">• List</button>
                                            <div className="flex-1" />
                                            <button onClick={() => setExpandedEditor({ sectionId: section.id, noteId: note.id, attId: att.id, content: att.content })}
                                              className="p-0.5 text-muted-foreground hover:text-foreground" title="Full editor">
                                              <Maximize2 className="h-2.5 w-2.5" />
                                            </button>
                                          </div>
                                          <div className="p-2.5 text-[10px] text-foreground min-h-[50px] outline-none leading-relaxed
                                            [&_b]:font-semibold [&_i]:italic [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:my-0.5"
                                            contentEditable suppressContentEditableWarning
                                            onBlur={e => { const t = e.currentTarget.innerHTML || ''; setSections(prev => prev.map(s => s.id === section.id ? { ...s, children: (s.children || []).map(n => n.id === note.id ? { ...n, attachments: (n.attachments || []).map(a => a.id === att.id ? { ...a, content: t } : a) } : n) } : s)); }}
                                            dangerouslySetInnerHTML={{ __html: att.content || 'Click to type...' }} />
                                        </div>
                                      ) : att.type === 'file' ? (
                                        <div className="px-2 py-1.5 rounded border border-border bg-card flex items-center gap-1.5">
                                          <FileText className="h-3 w-3 text-[#3B82F6]" />
                                          <span className="text-[9px] text-foreground">{att.content}</span>
                                        </div>
                                      ) : att.type === 'link' ? (
                                        <div className="px-2 py-1.5 rounded border border-border bg-card">
                                          <input defaultValue={att.content} placeholder="Paste URL..."
                                            className="text-[9px] text-[#3B82F6] bg-transparent border-none outline-none w-32"
                                            onBlur={e => { setSections(prev => prev.map(s => s.id === section.id ? { ...s, children: s.children.map(n => n.id === note.id ? { ...n, attachments: (n.attachments || []).map(a => a.id === att.id ? { ...a, content: e.target.value } : a) } : n) } : s)); }} />
                                        </div>
                                      ) : null}
                                      <button onClick={() => deleteAttachment(section.id, note.id, att.id)}
                                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/att:opacity-100 transition-opacity">
                                        <X className="h-2 w-2" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {atts.length === 0 && (
                                <p className="text-[9px] text-muted-foreground italic">Click buttons above to add stickies, notes, images, or documents to this area</p>
                              )}
                            </div>
                          )}
                        </div>
                        );
                      })}

                      {/* Add note form */}
                      {addingNoteTo === section.id && (
                        <div className="flex gap-1.5 px-2 py-1">
                          <input
                            value={newNoteText}
                            onChange={e => setNewNoteText(e.target.value)}
                            autoFocus
                            placeholder="Add a note..."
                            className="flex-1 px-2 py-1 text-[10px] bg-card border border-border rounded text-foreground focus:outline-none focus:border-[#3B82F6]/50"
                            onKeyDown={e => { if (e.key === 'Enter') addNoteToSection(section.id); if (e.key === 'Escape') setAddingNoteTo(null); }}
                          />
                          <button onClick={() => addNoteToSection(section.id)} disabled={!newNoteText.trim()} className="px-2 py-0.5 text-[9px] rounded bg-[#3B82F6] text-white disabled:opacity-40">Add</button>
                          <button onClick={() => setAddingNoteTo(null)} className="text-[8px] text-muted-foreground">Esc</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ═══ RICH TEXT EDITOR MODAL ═══ */}
          {expandedEditor && (
            <div className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-sm flex items-center justify-center p-8">
              <div className={`w-full bg-card rounded-2xl border border-border shadow-2xl flex flex-col ${(expandedEditor as any)?._fullWidth ? 'max-w-none max-h-[95vh]' : 'max-w-4xl max-h-[85vh]'} transition-all`}>
                {/* Toolbar */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
                  <FileText className="h-4 w-4 text-[#3B82F6]" />
                  <span className="text-sm font-semibold text-foreground">Rich Text Editor</span>
                  {/* Expand/shrink toggle */}
                  <button onClick={() => setExpandedEditor(prev => prev ? { ...prev, content: document.getElementById('rich-editor')?.innerHTML || prev.content, _fullWidth: !(prev as any)._fullWidth } : null)}
                    className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground" title="Toggle width">
                    <Maximize2 className="h-3.5 w-3.5" />
                  </button>
                  <div className="flex-1" />
                  {/* Voice recording → transcription */}
                  {isRecording ? (
                    <button onClick={() => { stopRecording(); const editor = document.getElementById('rich-editor'); if (editor) { editor.innerHTML += `<p>🎙 Voice note (${Math.floor(recordTime/60)}:${String(recordTime%60).padStart(2,'0')})</p>`; } }}
                      className="flex items-center gap-1 px-2.5 py-1 text-[10px] rounded-lg bg-red-500 text-white">
                      <Square className="h-3 w-3" /> {Math.floor(recordTime/60)}:{String(recordTime%60).padStart(2,'0')}
                    </button>
                  ) : (
                    <button onClick={() => startRecording()}
                      className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-red-400" title="Record audio and add to editor">
                      <Mic className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {/* Formatting toolbar */}
                  <div className="flex items-center gap-0.5 px-2 py-1 rounded-lg bg-secondary/30 border border-border">
                    <button onClick={() => document.execCommand('bold')} className="px-2 py-1 text-xs font-bold text-muted-foreground hover:text-foreground rounded hover:bg-muted/30" title="Bold">B</button>
                    <button onClick={() => document.execCommand('italic')} className="px-2 py-1 text-xs italic text-muted-foreground hover:text-foreground rounded hover:bg-muted/30" title="Italic">I</button>
                    <button onClick={() => document.execCommand('underline')} className="px-2 py-1 text-xs underline text-muted-foreground hover:text-foreground rounded hover:bg-muted/30" title="Underline">U</button>
                    <div className="w-px h-4 bg-border mx-1" />
                    <button onClick={() => document.execCommand('insertUnorderedList')} className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground rounded hover:bg-muted/30" title="Bullet list">• List</button>
                    <button onClick={() => document.execCommand('insertOrderedList')} className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground rounded hover:bg-muted/30" title="Numbered list">1. List</button>
                    <div className="w-px h-4 bg-border mx-1" />
                    <button onClick={() => document.execCommand('formatBlock', false, 'h3')} className="px-2 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground rounded hover:bg-muted/30" title="Heading">H</button>
                    <button onClick={() => document.execCommand('formatBlock', false, 'blockquote')} className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground rounded hover:bg-muted/30" title="Quote">"</button>
                  </div>
                  <button onClick={() => {
                    const editor = document.getElementById('rich-editor');
                    if (editor) {
                      const html = editor.innerHTML;
                      setSections(prev => prev.map(s => s.id === expandedEditor.sectionId ? {
                        ...s, children: (s.children || []).map(n => n.id === expandedEditor.noteId ? {
                          ...n, attachments: (n.attachments || []).map(a => a.id === expandedEditor.attId ? { ...a, content: html } : a)
                        } : n)
                      } : s));
                    }
                    setExpandedEditor(null);
                  }} className="px-4 py-1.5 text-xs rounded-lg bg-[#3B82F6] text-white hover:bg-[#2563EB]">Save & Close</button>
                  <button onClick={() => setExpandedEditor(null)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground border border-border">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {/* Editor area */}
                <div id="rich-editor"
                  className="flex-1 overflow-y-auto p-6 text-sm text-foreground leading-relaxed outline-none prose prose-sm max-w-none
                    [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-4 [&_h3]:mb-2
                    [&_blockquote]:border-l-3 [&_blockquote]:border-[#3B82F6] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground
                    [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5
                    [&_li]:my-1"
                  contentEditable
                  suppressContentEditableWarning
                  dangerouslySetInnerHTML={{ __html: expandedEditor.content || '<p>Start typing your content here...</p>' }}
                />
              </div>
            </div>
          )}

          {/* ═══ SECTION FULLSCREEN MODAL ═══ */}
          {fullscreenSectionId && (() => {
            const fSection = sections.find(s => s.id === fullscreenSectionId);
            if (!fSection) return null;
            return (
              <div className="fixed inset-0 z-50 bg-background overflow-y-auto" onClick={e => { if (e.target === e.currentTarget) setFullscreenSectionId(null); }}>
                <div className="max-w-5xl mx-auto p-8">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-6">
                    <h2 className="text-xl font-semibold text-foreground font-display flex-1">{fSection.title}</h2>
                    <button onClick={() => { setAddingNoteTo(fSection.id); setNewNoteText(''); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-[#3B82F6] text-white"><Plus className="h-3 w-3" /> Add Item</button>
                    <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground cursor-pointer">
                      <Upload className="h-3 w-3" /> Upload
                      <input type="file" className="hidden" multiple accept={UPLOAD_ACCEPT} onChange={e => handleFileUpload(e.target.files)} />
                    </label>
                    {/* Mic */}
                    {isRecording ? (
                      <button onClick={stopRecording} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-red-500 text-white">
                        <Square className="h-3 w-3" /> {Math.floor(recordTime/60)}:{String(recordTime%60).padStart(2,'0')}
                      </button>
                    ) : (
                      <button onClick={() => startRecording()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:text-red-400">
                        <Mic className="h-3 w-3" /> Record
                      </button>
                    )}
                    {/* Save */}
                    <button onClick={() => persist()}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg ${saveWb.isPending ? 'bg-[#0FB5AD]/10 text-[#0FB5AD]' : saveWb.isSuccess ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[#0FB5AD] text-white hover:bg-[#0a867f]'}`}>
                      {saveWb.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : saveWb.isSuccess ? <Check className="h-3 w-3" /> : null}
                      {saveWb.isPending ? 'Saving...' : saveWb.isSuccess ? 'Saved' : 'Save'}
                    </button>
                    <button onClick={() => setFullscreenSectionId(null)}
                      className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground"><Minimize2 className="h-4 w-4" /></button>
                  </div>

                  {/* Add note form */}
                  {addingNoteTo === fSection.id && (
                    <div className="mb-4 flex gap-2 p-3 rounded-lg border border-border bg-muted/20">
                      <input value={newNoteText} onChange={e => setNewNoteText(e.target.value)} autoFocus
                        placeholder="Add a note or topic..."
                        className="flex-1 px-3 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-[#3B82F6]/50"
                        onKeyDown={e => { if (e.key === 'Enter') addNoteToSection(fSection.id); if (e.key === 'Escape') setAddingNoteTo(null); }} />
                      <button onClick={() => addNoteToSection(fSection.id)} disabled={!newNoteText.trim()}
                        className="px-4 py-2 text-xs rounded-lg bg-[#3B82F6] text-white disabled:opacity-40">Add</button>
                    </div>
                  )}

                  {/* Notes — full-size cards */}
                  <div className="space-y-3">
                    {(fSection.children || []).map(note => {
                      const atts = note.attachments || [];
                      return (
                        <div key={note.id} className="rounded-xl border border-border bg-card overflow-hidden hover:border-[#3B82F6]/30 transition-colors">
                          {/* Note header */}
                          <div className="flex items-center gap-3 px-5 py-3 group/fn">
                            <button onClick={() => toggleNoteExpand(fSection.id, note.id)} className="shrink-0">
                              {note.expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                            </button>
                            {editingNoteId === note.id ? (
                              <div className="flex-1 flex gap-2">
                                <input value={editNoteText} onChange={e => setEditNoteText(e.target.value)} autoFocus
                                  className="flex-1 px-3 py-1.5 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none"
                                  onKeyDown={e => { if (e.key === 'Enter') saveEditNote(fSection.id, note.id); if (e.key === 'Escape') setEditingNoteId(null); }} />
                                <button onClick={() => saveEditNote(fSection.id, note.id)} className="p-1 text-emerald-400"><Check className="h-4 w-4" /></button>
                                <button onClick={() => setEditingNoteId(null)} className="p-1 text-muted-foreground"><X className="h-4 w-4" /></button>
                              </div>
                            ) : (
                              <span className="text-sm text-foreground flex-1 cursor-pointer" onClick={() => toggleNoteExpand(fSection.id, note.id)}>{note.text}</span>
                            )}
                            {atts.length > 0 && <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#f59e0b]/10 text-[#f59e0b]">{atts.length} items</span>}
                            <div className="flex gap-1 opacity-0 group-hover/fn:opacity-100 transition-opacity">
                              <button onClick={() => { setEditingNoteId(note.id); setEditNoteText(note.text); }} className="p-1 text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                              <button onClick={() => deleteNote(fSection.id, note.id)} className="p-1 text-muted-foreground hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                            </div>
                          </div>

                          {/* Expanded content — rich workspace */}
                          {note.expanded && (
                            <div className="px-5 pb-4 border-t border-border/50 pt-3">
                              {/* Action bar */}
                              <div className="flex items-center gap-2 mb-3 flex-wrap">
                                <button onClick={() => addAttachment(fSection.id, note.id, { id: uid(), type: 'sticky', content: 'New sticky', color: STICKY_COLORS[Math.floor(Math.random()*6)].bg })}
                                  className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] rounded-lg border border-border text-muted-foreground hover:text-[#f59e0b] hover:border-[#f59e0b]/30">
                                  <StickyNote className="h-3 w-3" /> Sticky Note
                                </button>
                                <button onClick={() => addAttachment(fSection.id, note.id, { id: uid(), type: 'text', content: '' })}
                                  className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] rounded-lg border border-border text-muted-foreground hover:text-[#3B82F6] hover:border-[#3B82F6]/30">
                                  <FileText className="h-3 w-3" /> Text Note
                                </button>
                                <label className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] rounded-lg border border-border text-muted-foreground hover:text-[#10B981] hover:border-[#10B981]/30 cursor-pointer">
                                  <Upload className="h-3 w-3" /> File / Image
                                  <input type="file" className="hidden" multiple accept={UPLOAD_ACCEPT} onChange={e => handleNoteFileUpload(e.target.files, fSection.id, note.id)} />
                                </label>
                                <label className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] rounded-lg border border-border text-muted-foreground hover:text-[#8B5CF6] hover:border-[#8B5CF6]/30 cursor-pointer">
                                  <Camera className="h-3 w-3" /> Photo
                                  <input type="file" className="hidden" accept="image/*" capture="environment" onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => addAttachment(fSection.id, note.id, { id: uid(), type: 'image', content: f.name, url: r.result as string }); r.readAsDataURL(f); } }} />
                                </label>
                                {/* Diagram — opens sketch pad in popup */}
                                <button onClick={() => addAttachment(fSection.id, note.id, { id: uid(), type: 'text', content: '<h3>Architecture Diagram</h3><p>Use the Sketch Pad zone below to draw diagrams, then screenshot and upload here.</p>' })}
                                  className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] rounded-lg border border-border text-muted-foreground hover:text-[#0FB5AD] hover:border-[#0FB5AD]/30">
                                  <PenTool className="h-3 w-3" /> Diagram
                                </button>
                              </div>

                              {/* Attachments — larger in fullscreen */}
                              {atts.length > 0 ? (
                                <div className="flex flex-wrap gap-3">
                                  {atts.map(att => (
                                    <div key={att.id} className="group/att relative">
                                      {att.type === 'sticky' ? (
                                        <div className="w-[200px] min-h-[100px] p-3 rounded-lg cursor-default"
                                          style={{ backgroundColor: att.color || '#FEF3C7', boxShadow: '2px 3px 8px rgba(0,0,0,0.1)', transform: `rotate(${(parseInt(att.id, 36) % 5 - 2) * 0.4}deg)` }}>
                                          <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap outline-none" contentEditable suppressContentEditableWarning
                                            onBlur={e => { const t = e.currentTarget.textContent || ''; setSections(prev => prev.map(s => s.id === fSection.id ? { ...s, children: (s.children || []).map(n => n.id === note.id ? { ...n, attachments: (n.attachments || []).map(a => a.id === att.id ? { ...a, content: t } : a) } : n) } : s)); }}>
                                            {att.content}
                                          </div>
                                        </div>
                                      ) : att.type === 'image' && att.url ? (
                                        <img src={att.url} alt={att.content} className="h-32 rounded-lg border border-border object-cover" />
                                      ) : att.type === 'text' ? (
                                        <div className="w-[360px] rounded-xl border border-border bg-card overflow-hidden group/ftxt">
                                          {/* Rich formatting toolbar */}
                                          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border/50 bg-muted/20">
                                            <button onClick={() => document.execCommand('bold')} className="px-2 py-0.5 text-[9px] font-bold text-muted-foreground hover:text-foreground rounded hover:bg-muted/50">B</button>
                                            <button onClick={() => document.execCommand('italic')} className="px-2 py-0.5 text-[9px] italic text-muted-foreground hover:text-foreground rounded hover:bg-muted/50">I</button>
                                            <button onClick={() => document.execCommand('underline')} className="px-2 py-0.5 text-[9px] underline text-muted-foreground hover:text-foreground rounded hover:bg-muted/50">U</button>
                                            <div className="w-px h-3 bg-border mx-0.5" />
                                            <button onClick={() => document.execCommand('insertUnorderedList')} className="px-2 py-0.5 text-[9px] text-muted-foreground hover:text-foreground rounded hover:bg-muted/50">• List</button>
                                            <button onClick={() => document.execCommand('insertOrderedList')} className="px-2 py-0.5 text-[9px] text-muted-foreground hover:text-foreground rounded hover:bg-muted/50">1.</button>
                                            <button onClick={() => document.execCommand('formatBlock', false, 'h3')} className="px-2 py-0.5 text-[9px] font-semibold text-muted-foreground hover:text-foreground rounded hover:bg-muted/50">H</button>
                                            <div className="flex-1" />
                                            {/* Mic */}
                                            {isRecording ? (
                                              <button onClick={() => { stopRecording(); }} className="px-2 py-0.5 text-[9px] text-red-400"><Square className="h-3 w-3 inline" /> {recordTime}s</button>
                                            ) : (
                                              <button onClick={() => startRecording()} className="p-0.5 text-muted-foreground hover:text-red-400" title="Record audio"><Mic className="h-3 w-3" /></button>
                                            )}
                                            {/* Expand */}
                                            <button onClick={() => setExpandedEditor({ sectionId: fSection.id, noteId: note.id, attId: att.id, content: att.content })}
                                              className="p-0.5 text-muted-foreground hover:text-foreground" title="Full screen editor">
                                              <Maximize2 className="h-3 w-3" />
                                            </button>
                                          </div>
                                          <div className="p-3 text-sm text-foreground leading-relaxed outline-none min-h-[80px]
                                            [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1
                                            [&_b]:font-semibold [&_i]:italic [&_u]:underline
                                            [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5
                                            [&_blockquote]:border-l-2 [&_blockquote]:border-[#3B82F6] [&_blockquote]:pl-3 [&_blockquote]:italic"
                                            contentEditable suppressContentEditableWarning
                                            onBlur={e => { const t = e.currentTarget.innerHTML || ''; setSections(prev => prev.map(s => s.id === fSection.id ? { ...s, children: (s.children || []).map(n => n.id === note.id ? { ...n, attachments: (n.attachments || []).map(a => a.id === att.id ? { ...a, content: t } : a) } : n) } : s)); }}
                                            dangerouslySetInnerHTML={{ __html: att.content || 'Click to type — use toolbar above for formatting...' }} />
                                        </div>
                                      ) : att.type === 'file' ? (
                                        <div className="px-3 py-2 rounded-lg border border-border bg-card flex items-center gap-2">
                                          <FileText className="h-4 w-4 text-[#3B82F6]" />
                                          <span className="text-xs text-foreground">{att.content}</span>
                                        </div>
                                      ) : null}
                                      <button onClick={() => deleteAttachment(fSection.id, note.id, att.id)}
                                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/att:opacity-100 transition-opacity text-[10px]">
                                        <X className="h-3 w-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground italic">Add stickies, notes, files, or images to this area</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ╔══════════════════════════════════════╗
             ║  ZONE 3: SKETCH PAD                  ║
             ╚══════════════════════════════════════╝ */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2 mb-3">
              <PenTool className="h-4 w-4 text-[#8B5CF6]" />
              <span className="text-xs font-semibold text-foreground">Sketch Pad</span>
              <div className="flex-1" />

              {/* Color picker */}
              <div className="flex items-center gap-1 mr-2">
                {PEN_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => { setPenColor(color); setIsEraser(false); }}
                    className={`w-4 h-4 rounded-full border-2 transition-transform ${penColor === color && !isEraser ? 'border-foreground scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              {/* Line width */}
              <div className="flex items-center gap-1 mr-2">
                <span className="text-[8px] text-muted-foreground">Width</span>
                <input
                  type="range"
                  min={1}
                  max={8}
                  value={penWidth}
                  onChange={e => setPenWidth(Number(e.target.value))}
                  className="w-16 h-3 accent-[#8B5CF6]"
                />
              </div>

              <button
                onClick={() => setIsEraser(e => !e)}
                className={`p-1.5 rounded-lg border border-border transition-colors ${isEraser ? 'bg-[#8B5CF6]/10 text-[#8B5CF6]' : 'text-muted-foreground hover:text-foreground'}`}
                title="Eraser"
              >
                <Eraser className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={clearCanvas}
                className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-red-400 transition-colors"
                title="Clear canvas"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="rounded-lg border border-border overflow-hidden bg-[#F5F6F9]">
              <canvas
                ref={canvasRef}
                className="w-full h-[260px] cursor-crosshair"
                style={{ cursor: isEraser ? 'cell' : 'crosshair' }}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
              />
            </div>
          </div>

          {/* ╔══════════════════════════════════════╗
             ║  ZONE 4: MEDIA GALLERY               ║
             ╚══════════════════════════════════════╝ */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Image className="h-4 w-4 text-[#10B981]" />
              <span className="text-xs font-semibold text-foreground">Media Gallery</span>
              <span className="text-[9px] text-muted-foreground">{filteredMedia.length} items</span>
              <div className="flex-1" />

              <label className="flex items-center gap-1 px-2.5 py-1 text-[10px] rounded-lg bg-[#10B981] text-white hover:bg-[#0d9668] cursor-pointer transition-colors">
                <Upload className="h-3 w-3" /> Upload
                <input type="file" className="hidden" multiple accept={UPLOAD_ACCEPT} onChange={e => { handleFileUpload(e.target.files); e.target.value = ''; }} />
              </label>

              <label className="flex items-center gap-1 px-2.5 py-1 text-[10px] rounded-lg border border-border text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                <Camera className="h-3 w-3" /> Photo
                <input type="file" className="hidden" accept="image/*" capture="environment" onChange={e => { const f = e.target.files?.[0]; if (f) handleCamera(f); e.target.value = ''; }} />
              </label>

              {isRecording ? (
                <button onClick={stopRecording} className="flex items-center gap-1 px-2.5 py-1 text-[10px] rounded-lg bg-red-500 text-white">
                  <Square className="h-3 w-3" /> {Math.floor(recordTime / 60)}:{String(recordTime % 60).padStart(2, '0')}
                </button>
              ) : (
                <button onClick={startRecording} className="flex items-center gap-1 px-2.5 py-1 text-[10px] rounded-lg border border-border text-muted-foreground hover:text-red-400 transition-colors">
                  <Mic className="h-3 w-3" /> Record
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredMedia.map(item => {
                const FileIcon = fileIcon(item.name);
                return (
                  <div key={item.id} className="group/media relative rounded-xl border border-border bg-card overflow-hidden hover:border-[#10B981]/40 transition-colors">
                    {/* Delete on hover */}
                    <button
                      onClick={() => deleteMedia(item.id)}
                      className="absolute top-1.5 right-1.5 z-10 p-1 rounded-full bg-black/40 text-white opacity-0 group-hover/media:opacity-100 transition-opacity hover:bg-red-500"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>

                    {item.type === 'image' && item.url ? (
                      <div className="aspect-square bg-muted/20 flex items-center justify-center overflow-hidden">
                        <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                    ) : item.type === 'audio' ? (
                      <div className="aspect-square bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 flex flex-col items-center justify-center gap-2 p-3">
                        <div className="p-3 rounded-full bg-red-500/10">
                          <Music className="h-6 w-6 text-red-500" />
                        </div>
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500 font-medium">AUDIO</span>
                      </div>
                    ) : (
                      <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/30 dark:to-gray-800/20 flex flex-col items-center justify-center gap-2 p-3">
                        <div className="p-3 rounded-full bg-[#3B82F6]/10">
                          <FileIcon className="h-6 w-6 text-[#3B82F6]" />
                        </div>
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-[#3B82F6]/10 text-[#3B82F6] font-medium uppercase">
                          {item.name.split('.').pop()}
                        </span>
                      </div>
                    )}

                    <div className="p-2">
                      <p className="text-[9px] text-foreground font-medium truncate">{item.name}</p>
                      {item.size && <p className="text-[8px] text-muted-foreground">{item.size}</p>}
                    </div>
                  </div>
                );
              })}

              {filteredMedia.length === 0 && (
                <div className="col-span-full text-center py-8">
                  <Image className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-[10px] text-muted-foreground">No media yet. Upload files, take photos, or record audio.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ╔══════════════════════════════════════╗
           ║  AI COPILOT SIDEBAR                  ║
           ╚══════════════════════════════════════╝ */}
        {chatOpen && (
          <div className="w-[300px] border-l border-border flex flex-col shrink-0 bg-card">
            {/* Header */}
            <div className="px-4 py-2.5 bg-[#0B1120] text-white flex items-center gap-2 shrink-0">
              <Sparkles className="h-3.5 w-3.5 text-[#0FB5AD]" />
              <span className="text-[11px] font-semibold">Discovery Copilot</span>
              <span className="text-[8px] text-white/40 ml-auto">{stickies.length + totalNotes} items</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {chatMessages.length === 0 && (
                <div className="space-y-1.5 py-4">
                  <p className="text-[10px] text-muted-foreground text-center mb-3">AI-powered workspace assistant</p>
                  {[
                    'Summarize notes into themes',
                    'What patterns do you see?',
                    'Organize all content into the right sections',
                    'Suggest assessment dimensions from notes',
                    `Create stickies for ${workshop.customerName}'s pain points`,
                  ].map((q, i) => (
                    <button
                      key={i}
                      onClick={() => setChatInput(q)}
                      className="w-full text-left px-3 py-2 rounded-lg bg-secondary/30 text-[10px] text-foreground hover:bg-secondary/50 transition-colors border border-transparent hover:border-border"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {chatMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[90%] px-3 py-2 rounded-2xl text-[10px] leading-relaxed whitespace-pre-wrap ${
                      m.role === 'user'
                        ? 'bg-[#0FB5AD] text-white rounded-tr-sm'
                        : 'bg-secondary/50 text-foreground rounded-tl-sm'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}

              {chatThinking && (
                <div className="flex justify-start">
                  <div className="px-3 py-2 rounded-2xl bg-secondary/50 text-[10px] text-muted-foreground flex items-center gap-1.5 rounded-tl-sm">
                    <Loader2 className="h-3 w-3 animate-spin text-[#0FB5AD]" />
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-2.5 border-t border-border shrink-0">
              <div className="flex gap-1.5">
                <label className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground cursor-pointer shrink-0 self-end">
                  <Upload className="h-3 w-3" />
                  <input type="file" className="hidden" accept={UPLOAD_ACCEPT} onChange={e => { handleFileUpload(e.target.files); e.target.value = ''; }} />
                </label>
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleChat()}
                  placeholder="Ask or command..."
                  className="flex-1 px-3 py-1.5 text-[10px] bg-secondary/30 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#0FB5AD]/50"
                />
                <button
                  onClick={handleChat}
                  disabled={!chatInput.trim() || chatThinking}
                  className="p-1.5 rounded-lg bg-[#0FB5AD] text-white disabled:opacity-40 shrink-0 self-end hover:bg-[#0a867f] transition-colors"
                >
                  <Send className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
