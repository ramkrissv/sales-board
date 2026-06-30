'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  Plus, Trash2, Pencil, Check, X, LayoutGrid,
  Sparkles, Loader2, ChevronDown, ChevronRight,
  Mic, Square, Upload, Camera, Send, ThumbsUp,
  ZoomIn, ZoomOut, Maximize2, StickyNote, Type,
  Eye, AlertTriangle, Lightbulb, Layers, Target,
  Shield, Users, Zap, FolderPlus, Palette,
} from 'lucide-react';

const STICKY_COLORS = [
  { id: 'yellow', bg: '#FEF3C7', shadow: '#F59E0B', text: '#92400E' },
  { id: 'blue', bg: '#DBEAFE', shadow: '#3B82F6', text: '#1E3A5F' },
  { id: 'green', bg: '#D1FAE5', shadow: '#10B981', text: '#065F46' },
  { id: 'pink', bg: '#FCE7F3', shadow: '#EC4899', text: '#831843' },
  { id: 'purple', bg: '#EDE9FE', shadow: '#8B5CF6', text: '#4C1D95' },
  { id: 'orange', bg: '#FFEDD5', shadow: '#F97316', text: '#9A3412' },
];

const ZONE_PRESETS = [
  { id: 'observations', label: 'Observations', icon: Eye, color: '#3B82F6' },
  { id: 'painpoints', label: 'Pain Points', icon: AlertTriangle, color: '#EF4444' },
  { id: 'opportunities', label: 'Opportunities', icon: Lightbulb, color: '#10B981' },
  { id: 'architecture', label: 'Architecture', icon: Layers, color: '#8B5CF6' },
  { id: 'people', label: 'People & Org', icon: Users, color: '#EC4899' },
  { id: 'quickwins', label: 'Quick Wins', icon: Zap, color: '#F59E0B' },
  { id: 'risks', label: 'Risks', icon: Shield, color: '#F97316' },
  { id: 'strategy', label: 'Strategy', icon: Target, color: '#0FB5AD' },
];

interface Sticky {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
  w: number;
  h: number;
  votes: number;
  zoneId?: string;
  type: 'note' | 'audio' | 'file';
}

interface Zone {
  id: string;
  label: string;
  color: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

interface Props { workshop: any; onRefresh: () => void; }

export default function WorkshopWhiteboard({ workshop, onRefresh }: Props) {
  const saved = (workshop as any).whiteboard;
  const canvasRef = useRef<HTMLDivElement>(null);

  const [stickies, setStickies] = useState<Sticky[]>(saved?.notes?.map((n: any) => ({
    ...n, x: n.x || Math.random() * 600, y: n.y || Math.random() * 400, w: 180, h: 120,
  })) || []);
  const [zones, setZones] = useState<Zone[]>(saved?.sections?.map((s: any, i: number) => ({
    id: s.id, label: s.title, color: s.color || '#3B82F6',
    x: (i % 4) * 280 + 20, y: Math.floor(i / 4) * 300 + 20, w: 260, h: 280,
  })) || []);

  const [dragging, setDragging] = useState<{ id: string; type: 'sticky' | 'zone'; offX: number; offY: number } | null>(null);
  const [selectedColor, setSelectedColor] = useState('yellow');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [addMode, setAddMode] = useState<'sticky' | 'zone' | null>(null);
  const [newText, setNewText] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [chatThinking, setChatThinking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [showZonePresets, setShowZonePresets] = useState(false);
  const [viewMode, setViewMode] = useState<'canvas' | 'structured'>('canvas');

  const chatMutation = trpc.ai.chat.useMutation();
  const saveWb = trpc.workshop.saveWhiteboard.useMutation();
  const mediaRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const saveRef = useRef<any>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const persist = useCallback((s: Sticky[], z: Zone[]) => {
    if (saveRef.current) clearTimeout(saveRef.current);
    saveRef.current = setTimeout(() => {
      saveWb.mutate({
        workshopId: workshop.id,
        sections: z.map(zn => ({ id: zn.id, title: zn.label, color: zn.color, x: zn.x, y: zn.y, w: zn.w, h: zn.h })) as any,
        notes: s.map(st => ({ id: st.id, text: st.text, color: st.color, x: st.x, y: st.y, votes: st.votes, type: st.type, sectionId: st.zoneId || '', groupId: st.zoneId || '' })) as any,
      });
    }, 1500);
  }, [workshop.id]);

  const setS = (fn: (p: Sticky[]) => Sticky[]) => setStickies(p => { const n = fn(p); persist(n, zones); return n; });
  const setZ = (fn: (p: Zone[]) => Zone[]) => setZones(p => { const n = fn(p); persist(stickies, n); return n; });

  // Canvas interaction
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (addMode === 'sticky' && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom + canvasRef.current.scrollTop / zoom;
      setS(prev => [...prev, { id: uid(), text: 'New note', color: selectedColor, x, y, w: 180, h: 120, votes: 0, type: 'note' }]);
      setAddMode(null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent, id: string, type: 'sticky' | 'zone') => {
    e.stopPropagation();
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    setDragging({ id, type, offX: e.clientX - rect.left, offY: e.clientY - rect.top });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, (e.clientX - rect.left - dragging.offX) / zoom);
    const y = Math.max(0, (e.clientY - rect.top - dragging.offY) / zoom + canvasRef.current.scrollTop / zoom);
    if (dragging.type === 'sticky') {
      setStickies(prev => prev.map(s => s.id === dragging.id ? { ...s, x, y } : s));
    } else {
      setZones(prev => prev.map(z => z.id === dragging.id ? { ...z, x, y } : z));
    }
  };

  const handleMouseUp = () => {
    if (dragging) { persist(stickies, zones); setDragging(null); }
  };

  // Add sticky from freeform text
  const addStickyFromText = () => {
    if (!newText.trim()) return;
    setS(prev => [...prev, {
      id: uid(), text: newText.trim(), color: selectedColor,
      x: 50 + Math.random() * 400, y: 50 + Math.random() * 300,
      w: 180, h: 120, votes: 0, type: 'note',
    }]);
    setNewText('');
  };

  // Add zone from preset
  const addZoneFromPreset = (preset: typeof ZONE_PRESETS[0]) => {
    setZ(prev => [...prev, {
      id: uid(), label: preset.label, color: preset.color,
      x: 20 + prev.length * 50, y: 20 + prev.length * 30, w: 280, h: 300,
    }]);
    setShowZonePresets(false);
  };

  // Audio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      rec.onstop = () => { stream.getTracks().forEach(t => t.stop()); setS(prev => [...prev, { id: uid(), text: `🎙 Voice (${Math.floor(recordTime/60)}:${String(recordTime%60).padStart(2,'0')})`, color: 'blue', x: 100 + Math.random()*300, y: 100 + Math.random()*200, w: 180, h: 80, votes: 0, type: 'audio' }]); };
      rec.start(); mediaRef.current = rec; setIsRecording(true); setRecordTime(0);
      timerRef.current = setInterval(() => setRecordTime(t => t+1), 1000);
    } catch {}
  };
  const stopRecording = () => { mediaRef.current?.stop(); setIsRecording(false); if (timerRef.current) clearInterval(timerRef.current); };

  // Camera OCR
  const handleOCR = async (file: File) => {
    setOcrProcessing(true);
    try {
      const result = await chatMutation.mutateAsync({
        message: `Extract ALL text from this whiteboard/sticky note photo. Return JSON array: [{"text":"<note text>"}]. One object per sticky note or distinct text block.`,
        context: { page: 'workshop-whiteboard' },
      });
      const match = result.response.match(/\[[\s\S]*\]/);
      if (match) {
        const items = JSON.parse(match[0]);
        const colors = ['yellow','blue','green','pink','purple','orange'];
        items.forEach((item: any, i: number) => {
          setS(prev => [...prev, { id: uid(), text: item.text, color: colors[i % colors.length], x: 60 + (i % 4) * 200, y: 60 + Math.floor(i / 4) * 140, w: 180, h: 120, votes: 0, type: 'note' }]);
        });
      }
    } catch {}
    setOcrProcessing(false);
  };

  // AI Chat
  const handleChat = async () => {
    if (!chatInput.trim() || chatThinking) return;
    const msg = chatInput.trim(); setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: msg }]);
    setChatThinking(true);
    try {
      const notesCtx = stickies.map(s => `- ${s.text} (${s.votes} votes)`).join('\n');
      const result = await chatMutation.mutateAsync({
        message: `Workshop whiteboard for ${workshop.customerName}. ${stickies.length} notes:\n${notesCtx || '(empty)'}\n\nUser: ${msg}\n\nHelp organize. If creating notes, format: [STICKY: text=<note text> color=<yellow|blue|green|pink|purple|orange>]`,
        context: { page: 'workshop-whiteboard' },
      });
      const resp = result.response;
      const stickyMatches = resp.matchAll(/\[STICKY:\s*text=([^\]]+?)(?:\s+color=(\w+))?\]/g);
      for (const m of stickyMatches) {
        setS(prev => [...prev, { id: uid(), text: m[1].trim(), color: m[2] || 'yellow', x: 80+Math.random()*400, y: 80+Math.random()*250, w: 180, h: 120, votes: 0, type: 'note' }]);
      }
      const clean = resp.replace(/\[STICKY:[^\]]+\]/g, '').trim();
      if (clean) setChatMessages(prev => [...prev, { role: 'ai', text: clean }]);
    } catch { setChatMessages(prev => [...prev, { role: 'ai', text: 'Error — try again.' }]); }
    setChatThinking(false);
  };

  const canvasW = Math.max(1400, ...stickies.map(s => s.x + s.w + 40), ...zones.map(z => z.x + z.w + 40));
  const canvasH = Math.max(800, ...stickies.map(s => s.y + s.h + 40), ...zones.map(z => z.y + z.h + 40));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-3 h-[calc(100vh-200px)]">
      {/* ═══════ CANVAS ═══════ */}
      <div className="flex flex-col rounded-xl border border-border overflow-hidden bg-card">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30 flex-wrap">
          <div className="flex items-center gap-1 mr-2">
            <LayoutGrid className="h-4 w-4 text-[#f59e0b]" />
            <span className="text-xs font-semibold text-foreground">Whiteboard</span>
          </div>

          {/* Add sticky */}
          <button onClick={() => setAddMode(addMode === 'sticky' ? null : 'sticky')}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-[10px] rounded-lg transition-colors ${addMode === 'sticky' ? 'bg-[#f59e0b] text-white' : 'border border-border text-muted-foreground hover:text-foreground'}`}>
            <StickyNote className="h-3 w-3" /> Sticky Note
          </button>

          {/* Color picker */}
          <div className="flex gap-0.5 px-1">
            {STICKY_COLORS.map(c => (
              <button key={c.id} onClick={() => setSelectedColor(c.id)}
                className={`w-5 h-5 rounded-full border-2 transition-all ${selectedColor === c.id ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'}`}
                style={{ backgroundColor: c.bg, boxShadow: selectedColor === c.id ? `0 0 0 1px ${c.shadow}` : 'none' }} />
            ))}
          </div>

          {/* Add zone */}
          <div className="relative">
            <button onClick={() => setShowZonePresets(!showZonePresets)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] rounded-lg border border-border text-muted-foreground hover:text-foreground">
              <FolderPlus className="h-3 w-3" /> Zone
            </button>
            {showZonePresets && (
              <div className="absolute top-full mt-1 left-0 z-50 bg-card border border-border rounded-lg shadow-lg p-2 w-48">
                {ZONE_PRESETS.map(p => (
                  <button key={p.id} onClick={() => addZoneFromPreset(p)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-[10px] rounded-md hover:bg-muted/30 text-left">
                    <p.icon className="h-3 w-3" style={{ color: p.color }} />
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-px h-5 bg-border mx-1" />

          {/* Voice */}
          {isRecording ? (
            <button onClick={stopRecording} className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] rounded-lg bg-red-500 text-white">
              <Square className="h-3 w-3" /> {Math.floor(recordTime/60)}:{String(recordTime%60).padStart(2,'0')}
            </button>
          ) : (
            <button onClick={startRecording} className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-red-400"><Mic className="h-3.5 w-3.5" /></button>
          )}

          {/* Camera */}
          <label className={`p-1.5 rounded-lg border border-border cursor-pointer transition-colors ${ocrProcessing ? 'text-[#0FB5AD]' : 'text-muted-foreground hover:text-[#0FB5AD]'}`}>
            {ocrProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            <input type="file" className="hidden" accept="image/*" capture="environment"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleOCR(f); e.target.value = ''; }} />
          </label>

          {/* Upload */}
          <label className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground cursor-pointer">
            <Upload className="h-3.5 w-3.5" />
            <input type="file" className="hidden" accept=".pdf,.docx,.txt,.png,.jpg"
              onChange={e => { const f = e.target.files?.[0]; if (f) { if (f.type.startsWith('image/')) handleOCR(f); else setS(prev => [...prev, { id: uid(), text: `📄 ${f.name}`, color: 'orange', x: 100+Math.random()*300, y: 100+Math.random()*200, w: 180, h: 80, votes: 0, type: 'file' }]); } e.target.value = ''; }} />
          </label>

          <div className="flex-1" />

          {/* Zoom */}
          <div className="flex items-center gap-1">
            <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-1 rounded text-muted-foreground hover:text-foreground"><ZoomOut className="h-3 w-3" /></button>
            <span className="text-[9px] font-mono text-muted-foreground w-8 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(1.5, z + 0.1))} className="p-1 rounded text-muted-foreground hover:text-foreground"><ZoomIn className="h-3 w-3" /></button>
            <button onClick={() => setZoom(1)} className="p-1 rounded text-muted-foreground hover:text-foreground"><Maximize2 className="h-3 w-3" /></button>
          </div>

          {/* View toggle */}
          <div className="flex gap-0.5 p-0.5 rounded-lg bg-secondary border border-border">
            <button onClick={() => setViewMode('canvas')}
              className={`px-2 py-1 text-[9px] rounded-md transition-colors ${viewMode === 'canvas' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
              Canvas
            </button>
            <button onClick={() => setViewMode('structured')}
              className={`px-2 py-1 text-[9px] rounded-md transition-colors ${viewMode === 'structured' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
              Structured
            </button>
          </div>
          <span className="text-[9px] text-muted-foreground">{stickies.length} notes · {zones.length} zones</span>
        </div>

        {/* Quick add bar */}
        <div className="flex gap-2 px-3 py-2 border-b border-border bg-muted/10">
          <input value={newText} onChange={e => setNewText(e.target.value)}
            placeholder="Type a note and press Enter — or click the canvas to place sticky notes..."
            className="flex-1 px-3 py-1.5 text-xs bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#f59e0b]/40"
            onKeyDown={e => { if (e.key === 'Enter') addStickyFromText(); }} />
          <button onClick={addStickyFromText} disabled={!newText.trim()}
            className="px-3 py-1.5 text-[10px] rounded-lg bg-[#f59e0b] text-white font-medium disabled:opacity-40">
            <Plus className="h-3 w-3" />
          </button>
        </div>

        {addMode === 'sticky' && (
          <div className="px-3 py-1.5 bg-[#f59e0b]/10 text-[10px] text-[#f59e0b] text-center">
            Click anywhere on the canvas to place a sticky note · Press Esc to cancel
          </div>
        )}

        {/* Canvas View */}
        {viewMode === 'canvas' && <div ref={canvasRef}
          className="flex-1 overflow-auto relative"
          style={{
            backgroundImage: 'radial-gradient(circle, var(--g-dot, rgba(0,0,0,0.06)) 1px, transparent 1px)',
            backgroundSize: `${16 * zoom}px ${16 * zoom}px`,
            cursor: addMode === 'sticky' ? 'crosshair' : 'default',
          }}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onKeyDown={e => { if (e.key === 'Escape') setAddMode(null); }}
          tabIndex={0}>

          <div style={{ width: canvasW * zoom, height: canvasH * zoom, position: 'relative', transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
            {/* Zones (background) */}
            {zones.map(zone => (
              <div key={zone.id}
                className="absolute rounded-xl border-2 border-dashed transition-shadow"
                style={{ left: zone.x, top: zone.y, width: zone.w, height: zone.h, borderColor: zone.color + '50', backgroundColor: zone.color + '08' }}
                onMouseDown={e => handleMouseDown(e, zone.id, 'zone')}>
                <div className="flex items-center gap-1.5 px-3 py-1.5" style={{ color: zone.color }}>
                  <span className="text-[10px] font-semibold">{zone.label}</span>
                  <span className="text-[8px] opacity-50">{stickies.filter(s => s.x >= zone.x && s.x <= zone.x + zone.w && s.y >= zone.y && s.y <= zone.y + zone.h).length} notes</span>
                  <div className="flex-1" />
                  <button onClick={(e) => { e.stopPropagation(); setZ(prev => prev.filter(z => z.id !== zone.id)); }}
                    className="p-0.5 rounded opacity-30 hover:opacity-100 transition-opacity"><Trash2 className="h-2.5 w-2.5" /></button>
                </div>
              </div>
            ))}

            {/* Sticky notes */}
            {stickies.map(sticky => {
              const c = STICKY_COLORS.find(sc => sc.id === sticky.color) || STICKY_COLORS[0];
              return (
                <div key={sticky.id}
                  className="absolute rounded-lg cursor-grab active:cursor-grabbing transition-shadow group/s"
                  style={{
                    left: sticky.x, top: sticky.y, width: sticky.w,
                    backgroundColor: c.bg,
                    boxShadow: `2px 3px 8px ${c.shadow}30, 0 1px 2px ${c.shadow}20`,
                    border: `1px solid ${c.shadow}25`,
                    zIndex: dragging?.id === sticky.id ? 100 : 10,
                    transform: `rotate(${(parseInt(sticky.id, 36) % 5 - 2) * 0.8}deg)`,
                  }}
                  onMouseDown={e => handleMouseDown(e, sticky.id, 'sticky')}>
                  {/* Tape effect */}
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-10 h-3 rounded-sm opacity-40"
                    style={{ backgroundColor: c.shadow + '40' }} />

                  <div className="p-3 pt-2">
                    {editingId === sticky.id ? (
                      <div onClick={e => e.stopPropagation()}>
                        <textarea value={editText} onChange={e => setEditText(e.target.value)} autoFocus
                          className="w-full p-1 text-[11px] bg-white/50 border border-black/10 rounded resize-none leading-relaxed"
                          style={{ color: c.text }} rows={4}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); setS(prev => prev.map(s => s.id === sticky.id ? { ...s, text: editText } : s)); setEditingId(null); } }} />
                        <div className="flex gap-1 justify-end mt-1">
                          <button onClick={() => setEditingId(null)} className="p-0.5"><X className="h-3 w-3" style={{ color: c.text }} /></button>
                          <button onClick={() => { setS(prev => prev.map(s => s.id === sticky.id ? { ...s, text: editText } : s)); setEditingId(null); }}
                            className="p-0.5"><Check className="h-3 w-3 text-emerald-600" /></button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-[11px] leading-relaxed whitespace-pre-wrap" style={{ color: c.text, fontFamily: "'Caveat', 'Inter', cursive" }}>
                          {sticky.text}
                        </p>
                        <div className="flex items-center gap-1 mt-2 opacity-0 group-hover/s:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                          <button onClick={() => setS(prev => prev.map(s => s.id === sticky.id ? { ...s, votes: s.votes + 1 } : s))}
                            className="text-[8px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: c.shadow + '20', color: c.text }}>
                            <ThumbsUp className="h-2 w-2 inline mr-0.5" />{sticky.votes}
                          </button>
                          <div className="flex-1" />
                          <button onClick={() => { setEditingId(sticky.id); setEditText(sticky.text); }}
                            className="p-0.5" style={{ color: c.text + '80' }}><Pencil className="h-2.5 w-2.5" /></button>
                          <button onClick={() => setS(prev => prev.filter(s => s.id !== sticky.id))}
                            className="p-0.5 text-red-400"><Trash2 className="h-2.5 w-2.5" /></button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        }

        {/* Structured View */}
        {viewMode === 'structured' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {zones.length === 0 && stickies.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <LayoutGrid className="h-8 w-8 mx-auto mb-3 opacity-30" />
                <div className="text-xs">No zones or notes yet. Add zones and notes from the toolbar, then switch to Structured view.</div>
              </div>
            )}

            {/* Ungrouped notes */}
            {(() => {
              const ungrouped = stickies.filter(s => {
                return !zones.some(z => s.x >= z.x && s.x <= z.x + z.w && s.y >= z.y && s.y <= z.y + z.h);
              });
              return ungrouped.length > 0 ? (
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/20">
                    <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold text-foreground">Ungrouped Notes</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{ungrouped.length}</span>
                  </div>
                  <div className="p-3 flex flex-wrap gap-2">
                    {ungrouped.map(note => {
                      const c = STICKY_COLORS.find(sc => sc.id === note.color) || STICKY_COLORS[0];
                      return (
                        <div key={note.id} className="px-3 py-2 rounded-lg text-[11px] leading-relaxed max-w-[220px]"
                          style={{ backgroundColor: c.bg, color: c.text, border: `1px solid ${c.shadow}25` }}>
                          {note.text}
                          <div className="flex items-center gap-1 mt-1.5 opacity-70">
                            <button onClick={() => setS(prev => prev.map(s => s.id === note.id ? { ...s, votes: s.votes + 1 } : s))}
                              className="text-[8px]"><ThumbsUp className="h-2 w-2 inline" /> {note.votes}</button>
                            <div className="flex-1" />
                            <button onClick={() => setS(prev => prev.filter(s => s.id !== note.id))} className="text-red-400"><Trash2 className="h-2.5 w-2.5" /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null;
            })()}

            {/* Zoned notes */}
            {zones.map(zone => {
              const zoneNotes = stickies.filter(s => s.x >= zone.x && s.x <= zone.x + zone.w && s.y >= zone.y && s.y <= zone.y + zone.h);
              return (
                <div key={zone.id} className="rounded-xl border overflow-hidden" style={{ borderColor: zone.color + '40' }}>
                  <div className="flex items-center gap-2 px-4 py-2.5" style={{ backgroundColor: zone.color + '08' }}>
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: zone.color }} />
                    <span className="text-xs font-semibold text-foreground">{zone.label}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-mono" style={{ backgroundColor: zone.color + '15', color: zone.color }}>{zoneNotes.length}</span>
                    <div className="flex-1" />
                    <button onClick={() => setZ(prev => prev.filter(z => z.id !== zone.id))} className="text-muted-foreground hover:text-red-400"><Trash2 className="h-3 w-3" /></button>
                  </div>
                  {zoneNotes.length > 0 ? (
                    <div className="p-3 flex flex-wrap gap-2">
                      {zoneNotes.sort((a, b) => b.votes - a.votes).map(note => {
                        const c = STICKY_COLORS.find(sc => sc.id === note.color) || STICKY_COLORS[0];
                        return (
                          <div key={note.id} className="px-3 py-2 rounded-lg text-[11px] leading-relaxed max-w-[220px] group/n"
                            style={{ backgroundColor: c.bg, color: c.text, border: `1px solid ${c.shadow}25` }}>
                            {note.text}
                            <div className="flex items-center gap-1 mt-1.5">
                              <button onClick={() => setS(prev => prev.map(s => s.id === note.id ? { ...s, votes: s.votes + 1 } : s))}
                                className="text-[8px] px-1 py-0.5 rounded" style={{ backgroundColor: c.shadow + '20' }}><ThumbsUp className="h-2 w-2 inline" /> {note.votes}</button>
                              <div className="flex-1" />
                              <button onClick={() => { setEditingId(note.id); setEditText(note.text); }}
                                className="opacity-0 group-hover/n:opacity-60" style={{ color: c.text }}><Pencil className="h-2.5 w-2.5" /></button>
                              <button onClick={() => setS(prev => prev.filter(s => s.id !== note.id))}
                                className="opacity-0 group-hover/n:opacity-60 text-red-400"><Trash2 className="h-2.5 w-2.5" /></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-[10px] text-muted-foreground">No notes in this zone yet. Drag notes here on the canvas.</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══════ AI COPILOT ═══════ */}
      <div className="rounded-xl bg-card border border-border overflow-hidden flex flex-col h-full">
        <div className="px-4 py-3 bg-[#0B1120] text-white flex items-center gap-2 shrink-0">
          <Sparkles className="h-3.5 w-3.5 text-[#0FB5AD]" />
          <span className="text-xs font-semibold">Discovery Copilot</span>
          <span className="text-[9px] text-white/40 ml-auto">{stickies.length} notes</span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {chatMessages.length === 0 && (
            <div className="space-y-2 py-2">
              <p className="text-[10px] text-muted-foreground text-center">Describe observations or ask for help organizing</p>
              {['Add 5 sticky notes about common AI challenges',
                'What themes emerge from the whiteboard?',
                'Create a zone for each assessment level',
                `What should we focus on for ${workshop.customerName}?`,
              ].map((q, i) => (
                <button key={i} onClick={() => setChatInput(q)}
                  className="w-full text-left px-3 py-2 rounded-lg bg-secondary/30 text-[10px] text-foreground hover:bg-secondary/50 transition-colors">{q}</button>
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
              <div className="px-3 py-2 rounded-xl bg-secondary/50 text-[10px] text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin text-[#f59e0b]" /> Thinking...
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="px-3 py-2 border-t border-border shrink-0">
          <div className="flex gap-1.5">
            <label className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground cursor-pointer shrink-0">
              <Upload className="h-3.5 w-3.5" />
              <input type="file" className="hidden" accept="image/*,.pdf,.docx,.txt"
                onChange={e => { const f = e.target.files?.[0]; if (f && f.type.startsWith('image/')) handleOCR(f); e.target.value = ''; }} />
            </label>
            <input value={chatInput} onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleChat()}
              placeholder="Ask, describe, paste..."
              className="flex-1 px-3 py-1.5 text-[10px] bg-secondary/30 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#f59e0b]/40" />
            <button onClick={handleChat} disabled={!chatInput.trim() || chatThinking}
              className="p-1.5 rounded-lg bg-[#f59e0b] text-white disabled:opacity-40"><Send className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
