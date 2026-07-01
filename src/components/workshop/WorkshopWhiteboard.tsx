'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  Plus, Trash2, Pencil, Check, X, LayoutGrid,
  Sparkles, Loader2, ChevronDown, ChevronRight,
  Mic, Square, Upload, Camera, Send, ThumbsUp,
  Maximize2, Minimize2, StickyNote,
  Eye, AlertTriangle, Lightbulb, Layers, Target,
  Shield, Users, Zap, FolderPlus, FileText, Image,
  PenTool, Link2, GripVertical, MoreHorizontal,
  FolderOpen, MessageSquare, ArrowRight, Hash,
} from 'lucide-react';

/* ═══════════════════════════════════════
   Types — nested block structure
   ═══════════════════════════════════════ */
type BlockType = 'section' | 'note' | 'sticky' | 'image' | 'link' | 'file' | 'audio' | 'divider' | 'heading';

interface Block {
  id: string;
  type: BlockType;
  content: string;
  color?: string;
  url?: string;
  fileName?: string;
  votes: number;
  collapsed: boolean;
  children: Block[];
  ts: number;
}

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const STICKY_COLORS = ['#FEF3C7', '#DBEAFE', '#D1FAE5', '#FCE7F3', '#EDE9FE', '#FFEDD5'];
const STICKY_BORDERS = ['#F59E0B', '#3B82F6', '#10B981', '#EC4899', '#8B5CF6', '#F97316'];
const UPLOAD_ACCEPT = '.pdf,.doc,.docx,.pptx,.ppt,.xls,.xlsx,.csv,.txt,.md,.rtf,.html,.json,.xml,.png,.jpg,.jpeg,.gif,.webp,.svg,.bmp';

const BLOCK_ICONS: Record<BlockType, any> = {
  section: FolderOpen, note: FileText, sticky: StickyNote,
  image: Image, link: Link2, file: FileText, audio: Mic,
  divider: MoreHorizontal, heading: Hash,
};

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */
interface Props { workshop: any; onRefresh: () => void; }

export default function WorkshopWhiteboard({ workshop, onRefresh }: Props) {
  const levels = workshop.framework?.levels || [];
  const workstreams = workshop.framework?.workstreams || [];
  const saved = (workshop as any).whiteboard;

  // Build initial blocks from framework
  const buildInitialBlocks = (): Block[] => {
    const blocks: Block[] = [];

    // Discovery sections
    blocks.push(makeSection('Discovery & Observations', [
      makeBlock('note', 'Key observations from initial conversations'),
      makeBlock('note', 'Client pain points and challenges'),
      makeBlock('note', 'Opportunities identified'),
    ]));

    // Per-level sections
    if (levels.length > 0) {
      blocks.push(makeSection('Assessment Domains', levels.map((l: any, i: number) =>
        makeSection(`${l.code || `L${i+1}`}: ${l.name}`, (l.dimensions || []).slice(0, 3).map((d: any) =>
          makeBlock('note', `${d.name} — ${d.probe || 'assess this dimension'}`)
        ))
      )));
    }

    // Strategy
    blocks.push(makeSection('Strategy & Planning', [
      makeBlock('note', 'Quick wins (0-30 days)'),
      makeBlock('note', 'Strategic initiatives (3-6 months)'),
      makeBlock('note', 'Governance & operating model'),
    ]));

    // Architecture
    blocks.push(makeSection('Architecture & Technical', [
      makeBlock('note', 'Current state architecture'),
      makeBlock('note', 'Target state vision'),
      makeBlock('note', 'Technical building blocks'),
    ]));

    // Documents & media
    blocks.push(makeSection('Documents & Media', [
      makeBlock('note', 'Upload documents, images, screenshots, and links here'),
    ]));

    return blocks;
  };

  function makeSection(title: string, children: Block[] = []): Block {
    return { id: uid(), type: 'section', content: title, votes: 0, collapsed: false, children, ts: Date.now() };
  }
  function makeBlock(type: BlockType, content: string, extra: Partial<Block> = {}): Block {
    return { id: uid(), type, content, votes: 0, collapsed: false, children: [], ts: Date.now(), ...extra };
  }

  const [blocks, setBlocks] = useState<Block[]>(saved?.blocks || buildInitialBlocks());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [addType, setAddType] = useState<BlockType>('note');
  const [newContent, setNewContent] = useState('');
  const [newColor, setNewColor] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [chatThinking, setChatThinking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const chatMutation = trpc.ai.chat.useMutation();
  const saveWb = trpc.workshop.saveWhiteboard.useMutation();
  const mediaRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const saveRef = useRef<any>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  // Auto-save
  const persist = useCallback((b: Block[]) => {
    if (saveRef.current) clearTimeout(saveRef.current);
    saveRef.current = setTimeout(() => {
      saveWb.mutate({ workshopId: workshop.id, sections: [] as any, notes: [{ id: 'blocks', text: JSON.stringify(b), color: '', sectionId: '', groupId: '', votes: 0, type: 'note', timestamp: Date.now() }] as any });
    }, 2000);
  }, [workshop.id]);

  // Deep update helper — finds block by id in nested tree and applies updater
  const updateBlock = (id: string, updater: (b: Block) => Block) => {
    const walk = (blocks: Block[]): Block[] =>
      blocks.map(b => b.id === id ? updater(b) : { ...b, children: walk(b.children) });
    setBlocks(prev => { const next = walk(prev); persist(next); return next; });
  };

  const addBlock = (parentId: string | null, block: Block) => {
    if (!parentId) {
      setBlocks(prev => { const next = [...prev, block]; persist(next); return next; });
    } else {
      const walk = (blocks: Block[]): Block[] =>
        blocks.map(b => b.id === parentId ? { ...b, children: [...b.children, block] } : { ...b, children: walk(b.children) });
      setBlocks(prev => { const next = walk(prev); persist(next); return next; });
    }
  };

  const deleteBlock = (id: string) => {
    const walk = (blocks: Block[]): Block[] =>
      blocks.filter(b => b.id !== id).map(b => ({ ...b, children: walk(b.children) }));
    setBlocks(prev => { const next = walk(prev); persist(next); return next; });
  };

  // Add from input
  const handleAdd = (parentId: string | null) => {
    if (!newContent.trim() && addType !== 'divider') return;
    const block = makeBlock(addType, newContent.trim(), addType === 'sticky' ? { color: STICKY_COLORS[newColor] } : {});
    if (addType === 'section') block.children = [];
    addBlock(parentId, block);
    setNewContent('');
    setAddingTo(null);
  };

  // File upload
  const handleFiles = (files: FileList | null, parentId: string | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      const isImage = file.type.startsWith('image/');
      if (isImage) {
        // Create image block
        const reader = new FileReader();
        reader.onload = () => {
          addBlock(parentId, makeBlock('image', file.name, { url: reader.result as string, fileName: file.name }));
        };
        reader.readAsDataURL(file);
        // Also OCR
        handleOCR(file, parentId);
      } else {
        // File block
        const ext = file.name.split('.').pop()?.toUpperCase() || '';
        addBlock(parentId, makeBlock('file', `${file.name} (${(file.size/1024).toFixed(0)} KB · ${ext})`, { fileName: file.name }));
        // Read text content
        if (['txt','md','csv','html','json','xml','rtf'].includes(ext.toLowerCase())) {
          const reader = new FileReader();
          reader.onload = () => {
            const content = (reader.result as string).slice(0, 2000);
            updateBlock(parentId || '', b => ({ ...b })); // trigger save
            // Add extracted content as child note
            const noteId = uid();
            addBlock(parentId, makeBlock('note', `📄 Content from ${file.name}:\n${content}`));
          };
          reader.readAsText(file);
        }
      }
    });
  };

  // OCR
  const handleOCR = async (file: File, parentId: string | null) => {
    setOcrProcessing(true);
    try {
      const result = await chatMutation.mutateAsync({
        message: `Extract ALL text from this image (whiteboard, sticky notes, diagram, screenshot). Return JSON: [{"text":"<note>","type":"note|sticky"}]`,
        context: { page: 'workshop-whiteboard' },
      });
      const match = result.response.match(/\[[\s\S]*\]/);
      if (match) {
        const items = JSON.parse(match[0]);
        items.forEach((item: any, i: number) => {
          addBlock(parentId, makeBlock(
            item.type === 'sticky' ? 'sticky' : 'note',
            item.text,
            item.type === 'sticky' ? { color: STICKY_COLORS[i % STICKY_COLORS.length] } : {}
          ));
        });
      }
    } catch {}
    setOcrProcessing(false);
  };

  // Audio
  const startRecording = async (parentId: string | null) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      rec.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        addBlock(parentId, makeBlock('audio', `Voice note (${Math.floor(recordTime/60)}:${String(recordTime%60).padStart(2,'0')})`));
      };
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
      const flatNotes = flattenBlocks(blocks).filter(b => b.type !== 'section' && b.type !== 'divider').map(b => b.content).join('\n- ');
      const sectionNames = flattenBlocks(blocks).filter(b => b.type === 'section').map(b => `${b.id}: ${b.content}`).join(', ');
      const result = await chatMutation.mutateAsync({
        message: `Workshop whiteboard copilot for ${workshop.customerName}. ${flattenBlocks(blocks).length} blocks.\n\nSections: ${sectionNames}\n\nNotes:\n- ${flatNotes.slice(0, 2000) || '(empty)'}\n\nUser: ${msg}\n\nHelp organize. To add blocks: [ADD: parent=<sectionId|root> type=<note|sticky|section|heading> content=<text>]`,
        context: { page: 'workshop-whiteboard' },
      });
      const resp = result.response;
      const addMatches = resp.matchAll(/\[ADD:\s*parent=(\S+)\s+type=(\S+)\s+content=([^\]]+)\]/g);
      for (const m of addMatches) {
        const parentId = m[1] === 'root' ? null : m[1];
        const type = (['note','sticky','section','heading'].includes(m[2]) ? m[2] : 'note') as BlockType;
        addBlock(parentId, makeBlock(type, m[3].trim(), type === 'sticky' ? { color: STICKY_COLORS[Math.floor(Math.random()*6)] } : {}));
      }
      const clean = resp.replace(/\[ADD:[^\]]+\]/g, '').trim();
      if (clean) setChatMessages(prev => [...prev, { role: 'ai', text: clean }]);
    } catch { setChatMessages(prev => [...prev, { role: 'ai', text: 'Error — try again.' }]); }
    setChatThinking(false);
  };

  // Flatten for counting
  const flattenBlocks = (blocks: Block[]): Block[] => blocks.flatMap(b => [b, ...flattenBlocks(b.children)]);
  const totalBlocks = flattenBlocks(blocks).length;
  const totalNotes = flattenBlocks(blocks).filter(b => b.type !== 'section' && b.type !== 'divider').length;

  // Search filter
  const matchesSearch = (block: Block): boolean => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return block.content.toLowerCase().includes(q) || block.children.some(matchesSearch);
  };

  /* ═══════════════════════════════════════
     RENDER
     ═══════════════════════════════════════ */
  return (
    <div className={`flex flex-col ${isFullscreen ? 'g-fullscreen' : 'min-h-[600px]'}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-card rounded-t-xl flex-wrap shrink-0">
        <LayoutGrid className="h-4 w-4 text-[#f59e0b]" />
        <span className="text-xs font-semibold text-foreground">Discovery Workspace</span>
        <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#f59e0b]/10 text-[#f59e0b] font-medium">{totalNotes} notes · {blocks.length} sections</span>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Quick add to root */}
        <button onClick={() => { setAddingTo('__root__'); setAddType('section'); }} className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] rounded-lg border border-border text-muted-foreground hover:text-foreground">
          <FolderPlus className="h-3 w-3" /> Section
        </button>
        <button onClick={() => { setAddingTo('__root__'); setAddType('sticky'); }} className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] rounded-lg border border-border text-muted-foreground hover:text-foreground">
          <StickyNote className="h-3 w-3" /> Sticky
        </button>

        {/* Voice */}
        {isRecording ? (
          <button onClick={stopRecording} className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] rounded-lg bg-red-500 text-white">
            <Square className="h-3 w-3" /> {Math.floor(recordTime/60)}:{String(recordTime%60).padStart(2,'0')}
          </button>
        ) : (
          <button onClick={() => startRecording(null)} className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-red-400"><Mic className="h-3.5 w-3.5" /></button>
        )}

        {/* Camera/Upload */}
        <label className={`p-1.5 rounded-lg border border-border cursor-pointer ${ocrProcessing ? 'text-[#0FB5AD]' : 'text-muted-foreground hover:text-[#0FB5AD]'}`}>
          {ocrProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
          <input type="file" className="hidden" accept="image/*" capture="environment" onChange={e => { const f = e.target.files?.[0]; if (f) handleOCR(f, null); e.target.value = ''; }} />
        </label>
        <label className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground cursor-pointer">
          <Upload className="h-3.5 w-3.5" />
          <input type="file" className="hidden" multiple accept={UPLOAD_ACCEPT} onChange={e => { handleFiles(e.target.files, null); e.target.value = ''; }} />
        </label>

        <div className="flex-1" />

        {/* Search */}
        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search notes..."
          className="px-2.5 py-1 text-[10px] bg-secondary/30 border border-border rounded-lg text-foreground w-36 focus:outline-none focus:border-[#f59e0b]/40" />

        <button onClick={() => setIsFullscreen(f => !f)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground">
          {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Block tree */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {/* Root add form */}
          {addingTo === '__root__' && (
            <AddBlockForm type={addType} onTypeChange={setAddType} content={newContent} onContentChange={setNewContent}
              colorIdx={newColor} onColorChange={setNewColor} onAdd={() => { handleAdd(null); setAddingTo(null); }}
              onCancel={() => setAddingTo(null)} onFileUpload={f => handleFiles(f, null)} />
          )}

          {blocks.filter(matchesSearch).map(block => (
            <BlockNode key={block.id} block={block} depth={0}
              editingId={editingId} editText={editText}
              onEdit={(id, text) => { setEditingId(id); setEditText(text); }}
              onSaveEdit={(id) => { updateBlock(id, b => ({ ...b, content: editText })); setEditingId(null); }}
              onCancelEdit={() => setEditingId(null)}
              onEditTextChange={setEditText}
              onToggle={(id) => updateBlock(id, b => ({ ...b, collapsed: !b.collapsed }))}
              onVote={(id) => updateBlock(id, b => ({ ...b, votes: b.votes + 1 }))}
              onDelete={deleteBlock}
              onAddChild={(parentId, type) => { setAddingTo(parentId); setAddType(type); setNewContent(''); }}
              addingTo={addingTo} addType={addType}
              newContent={newContent} onNewContentChange={setNewContent}
              newColor={newColor} onNewColorChange={setNewColor}
              onAddConfirm={(parentId) => { handleAdd(parentId); setAddingTo(null); }}
              onAddCancel={() => setAddingTo(null)}
              onFileUpload={(f, pid) => handleFiles(f, pid)}
              onRecord={(pid) => startRecording(pid)}
              searchQuery={searchQuery}
            />
          ))}

          {blocks.length === 0 && (
            <div className="text-center py-16">
              <LayoutGrid className="h-10 w-10 text-muted-foreground opacity-20 mx-auto mb-3" />
              <div className="text-sm text-foreground mb-1">Empty workspace</div>
              <div className="text-xs text-muted-foreground mb-4">Add sections, notes, stickies, images, and documents</div>
              <button onClick={() => setBlocks(buildInitialBlocks())}
                className="px-4 py-2 text-xs rounded-lg bg-[#f59e0b] text-white">
                Load default structure
              </button>
            </div>
          )}
        </div>

        {/* AI Copilot */}
        <div className="w-[300px] border-l border-border flex flex-col shrink-0 bg-card">
          <div className="px-4 py-2.5 bg-[#0B1120] text-white flex items-center gap-2 shrink-0">
            <Sparkles className="h-3 w-3 text-[#0FB5AD]" />
            <span className="text-[10px] font-semibold">Discovery Copilot</span>
            <span className="text-[8px] text-white/40 ml-auto">{totalNotes}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
            {chatMessages.length === 0 && (
              <div className="space-y-1.5 py-2">
                <p className="text-[9px] text-muted-foreground text-center">Add notes via chat — AI organizes them</p>
                {['Summarize all notes into themes', 'Add a section for risk assessment', 'What key gaps should we explore?', `Create sticky notes for ${workshop.customerName}'s pain points`].map((q, i) => (
                  <button key={i} onClick={() => setChatInput(q)} className="w-full text-left px-2.5 py-1.5 rounded-lg bg-secondary/30 text-[9px] text-foreground hover:bg-secondary/50">{q}</button>
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
          <div className="px-2.5 py-2 border-t border-border shrink-0 flex gap-1">
            <label className="p-1.5 rounded border border-border text-muted-foreground hover:text-foreground cursor-pointer shrink-0">
              <Upload className="h-3 w-3" />
              <input type="file" className="hidden" accept={UPLOAD_ACCEPT} onChange={e => { handleFiles(e.target.files, null); e.target.value = ''; }} />
            </label>
            <input value={chatInput} onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleChat()}
              placeholder="Ask or add notes..."
              className="flex-1 px-2.5 py-1 text-[9px] bg-secondary/30 border border-border rounded text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#f59e0b]/40" />
            <button onClick={handleChat} disabled={!chatInput.trim() || chatThinking}
              className="p-1.5 rounded bg-[#f59e0b] text-white disabled:opacity-40"><Send className="h-3 w-3" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   Block Node — recursive nested rendering
   ═══════════════════════════════════════ */
function BlockNode({ block, depth, editingId, editText, onEdit, onSaveEdit, onCancelEdit, onEditTextChange,
  onToggle, onVote, onDelete, onAddChild, addingTo, addType, newContent, onNewContentChange,
  newColor, onNewColorChange, onAddConfirm, onAddCancel, onFileUpload, onRecord, searchQuery }: {
  block: Block; depth: number; editingId: string | null; editText: string;
  onEdit: (id: string, text: string) => void; onSaveEdit: (id: string) => void;
  onCancelEdit: () => void; onEditTextChange: (t: string) => void;
  onToggle: (id: string) => void; onVote: (id: string) => void;
  onDelete: (id: string) => void; onAddChild: (id: string, type: BlockType) => void;
  addingTo: string | null; addType: BlockType;
  newContent: string; onNewContentChange: (t: string) => void;
  newColor: number; onNewColorChange: (n: number) => void;
  onAddConfirm: (id: string) => void; onAddCancel: () => void;
  onFileUpload: (f: FileList | null, pid: string) => void;
  onRecord: (pid: string) => void; searchQuery: string;
}) {
  const isSection = block.type === 'section';
  const isSticky = block.type === 'sticky';
  const isEditing = editingId === block.id;
  const Icon = BLOCK_ICONS[block.type] || FileText;

  if (block.type === 'divider') {
    return <div className="h-px bg-border my-2" style={{ marginLeft: depth * 24 }} />;
  }

  return (
    <div style={{ marginLeft: depth * 20 }}>
      <div className={`group/block rounded-lg transition-colors ${
        isSection ? 'mb-1' :
        isSticky ? 'mb-1.5' :
        'mb-0.5 hover:bg-muted/10'
      }`}>
        <div className={`flex items-start gap-1.5 px-2 py-1.5 ${isSection ? 'py-2' : ''}`}
          style={isSticky ? { backgroundColor: (block.color || '#FEF3C7') + '40', borderLeft: `3px solid ${STICKY_BORDERS[STICKY_COLORS.indexOf(block.color || '#FEF3C7')] || '#F59E0B'}`, borderRadius: '6px', padding: '8px 10px' } : {}}>

          {/* Expand/collapse for sections */}
          {isSection ? (
            <button onClick={() => onToggle(block.id)} className="p-0.5 mt-0.5 shrink-0">
              {block.collapsed ? <ChevronRight className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
            </button>
          ) : (
            <Icon className="h-3 w-3 text-muted-foreground mt-1 shrink-0" />
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex gap-1">
                <textarea value={editText} onChange={e => onEditTextChange(e.target.value)} autoFocus rows={isSection ? 1 : 3}
                  className="flex-1 px-2 py-1 text-[11px] bg-card border border-border rounded text-foreground resize-none"
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSaveEdit(block.id); } if (e.key === 'Escape') onCancelEdit(); }} />
                <button onClick={() => onSaveEdit(block.id)} className="p-0.5 text-emerald-400 shrink-0"><Check className="h-3 w-3" /></button>
                <button onClick={onCancelEdit} className="p-0.5 text-muted-foreground shrink-0"><X className="h-3 w-3" /></button>
              </div>
            ) : (
              <div onClick={() => onEdit(block.id, block.content)}
                className={`cursor-text ${isSection ? 'text-xs font-semibold text-foreground' : 'text-[11px] text-foreground leading-relaxed whitespace-pre-wrap'}`}>
                {block.content}
                {block.fileName && <span className="text-[9px] text-muted-foreground ml-1">({block.fileName})</span>}
                {block.url && block.type === 'link' && <a href={block.url} target="_blank" rel="noopener" className="text-[#3B82F6] text-[9px] ml-1 hover:underline">{block.url}</a>}
              </div>
            )}
            {/* Image preview */}
            {block.type === 'image' && block.url && (
              <img src={block.url} alt={block.content} className="mt-1.5 max-h-32 rounded-lg border border-border" />
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover/block:opacity-100 transition-opacity">
            {block.votes > 0 && <span className="text-[8px] text-[#f59e0b] font-medium mr-0.5">{block.votes}</span>}
            <button onClick={() => onVote(block.id)} className="p-0.5 text-muted-foreground hover:text-[#f59e0b]"><ThumbsUp className="h-2.5 w-2.5" /></button>
            {isSection && (
              <>
                <button onClick={() => onAddChild(block.id, 'note')} className="p-0.5 text-muted-foreground hover:text-foreground" title="Add note"><Plus className="h-2.5 w-2.5" /></button>
                <button onClick={() => onAddChild(block.id, 'sticky')} className="p-0.5 text-muted-foreground hover:text-[#f59e0b]" title="Add sticky"><StickyNote className="h-2.5 w-2.5" /></button>
                <button onClick={() => onAddChild(block.id, 'section')} className="p-0.5 text-muted-foreground hover:text-[#7c3aed]" title="Add sub-section"><FolderPlus className="h-2.5 w-2.5" /></button>
                <label className="p-0.5 text-muted-foreground hover:text-foreground cursor-pointer" title="Upload">
                  <Upload className="h-2.5 w-2.5" />
                  <input type="file" className="hidden" multiple accept={UPLOAD_ACCEPT} onChange={e => { onFileUpload(e.target.files, block.id); e.target.value = ''; }} />
                </label>
                <button onClick={() => onRecord(block.id)} className="p-0.5 text-muted-foreground hover:text-red-400" title="Record"><Mic className="h-2.5 w-2.5" /></button>
              </>
            )}
            <button onClick={() => onEdit(block.id, block.content)} className="p-0.5 text-muted-foreground hover:text-foreground"><Pencil className="h-2.5 w-2.5" /></button>
            <button onClick={() => onDelete(block.id)} className="p-0.5 text-muted-foreground hover:text-red-400"><Trash2 className="h-2.5 w-2.5" /></button>
          </div>

          {/* Section children count */}
          {isSection && block.collapsed && block.children.length > 0 && (
            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">{block.children.length}</span>
          )}
        </div>
      </div>

      {/* Children (nested) */}
      {isSection && !block.collapsed && (
        <div className="ml-2 border-l border-border/50 pl-1">
          {block.children.map(child => (
            <BlockNode key={child.id} block={child} depth={depth + 1}
              editingId={editingId} editText={editText} onEdit={onEdit} onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit} onEditTextChange={onEditTextChange}
              onToggle={onToggle} onVote={onVote} onDelete={onDelete} onAddChild={onAddChild}
              addingTo={addingTo} addType={addType} newContent={newContent} onNewContentChange={onNewContentChange}
              newColor={newColor} onNewColorChange={onNewColorChange}
              onAddConfirm={onAddConfirm} onAddCancel={onAddCancel}
              onFileUpload={onFileUpload} onRecord={onRecord} searchQuery={searchQuery} />
          ))}
          {/* Add block form for this section */}
          {addingTo === block.id && (
            <div style={{ marginLeft: (depth + 1) * 20 }}>
              <AddBlockForm type={addType} onTypeChange={() => {}} content={newContent} onContentChange={onNewContentChange}
                colorIdx={newColor} onColorChange={onNewColorChange}
                onAdd={() => onAddConfirm(block.id)} onCancel={onAddCancel}
                onFileUpload={f => onFileUpload(f, block.id)} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   Add Block Form
   ═══════════════════════════════════════ */
function AddBlockForm({ type, onTypeChange, content, onContentChange, colorIdx, onColorChange, onAdd, onCancel, onFileUpload }: {
  type: BlockType; onTypeChange: (t: BlockType) => void; content: string; onContentChange: (t: string) => void;
  colorIdx: number; onColorChange: (n: number) => void; onAdd: () => void; onCancel: () => void;
  onFileUpload: (f: FileList | null) => void;
}) {
  return (
    <div className="flex gap-2 p-2 rounded-lg bg-muted/20 border border-border mb-1.5 items-start">
      {type === 'sticky' && (
        <div className="flex gap-0.5 shrink-0 mt-1">
          {STICKY_COLORS.map((c, i) => (
            <button key={c} onClick={() => onColorChange(i)}
              className={`w-4 h-4 rounded-full border ${colorIdx === i ? 'border-foreground scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
      )}
      <textarea value={content} onChange={e => onContentChange(e.target.value)} autoFocus
        placeholder={type === 'section' ? 'Section title...' : type === 'sticky' ? 'Sticky note...' : type === 'link' ? 'URL...' : 'Note...'}
        rows={type === 'section' ? 1 : 2}
        className="flex-1 px-2 py-1 text-[10px] bg-card border border-border rounded text-foreground resize-none"
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onAdd(); } if (e.key === 'Escape') onCancel(); }} />
      <div className="flex flex-col gap-1 shrink-0">
        <button onClick={onAdd} disabled={!content.trim() && type !== 'divider'}
          className="px-2 py-1 text-[9px] rounded bg-[#f59e0b] text-white disabled:opacity-40">Add</button>
        <button onClick={onCancel} className="text-[8px] text-muted-foreground text-center">Esc</button>
      </div>
    </div>
  );
}
