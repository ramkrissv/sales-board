'use client';

import { useState, useRef, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  MessageCircle, Send, Users, FileText, Link2, Plus, Sparkles,
  Loader2, Clock, CheckCircle, Upload, ExternalLink, Lock, Globe,
  X, ChevronDown, Eye,
} from 'lucide-react';

interface AIDealRoomProps {
  opportunityId: string;
  customerName: string;
  opportunityName: string;
}

interface RoomMessage {
  id: string;
  type: 'chat' | 'file' | 'system' | 'ai';
  author: string;
  content: string;
  timestamp: Date;
}

interface SharedDoc {
  id: string;
  name: string;
  type: 'proposal' | 'sow' | 'contract' | 'presentation' | 'other';
  status: 'draft' | 'shared' | 'viewed' | 'signed';
  sharedWith: string[];
  uploadedAt: Date;
}

export default function AIDealRoom({ opportunityId, customerName, opportunityName }: AIDealRoomProps) {
  const [messages, setMessages] = useState<RoomMessage[]>([
    { id: 'sys-1', type: 'system', author: 'System', content: `Deal room created for ${customerName} — ${opportunityName}`, timestamp: new Date(Date.now() - 86400000) },
    { id: 'ai-1', type: 'ai', author: 'Galent AI', content: `I'm monitoring this deal room. I'll surface insights and suggest next actions based on team discussions.`, timestamp: new Date(Date.now() - 86400000) },
  ]);
  const [docs, setDocs] = useState<SharedDoc[]>([
    { id: 'doc-1', name: 'Proposal v1.0', type: 'proposal', status: 'shared', sharedWith: [customerName], uploadedAt: new Date(Date.now() - 172800000) },
  ]);
  const [input, setInput] = useState('');
  const [activeSection, setActiveSection] = useState<'chat' | 'docs' | 'portal'>('chat');
  const [showDocUpload, setShowDocUpload] = useState(false);
  const [docForm, setDocForm] = useState({ name: '', type: 'other' as SharedDoc['type'] });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatMutation = trpc.ai.chat.useMutation();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const msg = input.trim();
    if (!msg) return;

    const userMsg: RoomMessage = {
      id: `msg-${Date.now()}`,
      type: 'chat',
      author: 'You',
      content: msg,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // AI responds to team messages
    chatMutation.mutate(
      {
        message: `Deal room message from team member: "${msg}"\n\nContext: ${customerName} deal room.\nRespond briefly as an AI deal assistant. If there's an action to take, suggest it. Max 2 sentences.`,
        context: { opportunityId, page: 'deal-room' },
      },
      {
        onSuccess: (data) => {
          setMessages(prev => [...prev, {
            id: `ai-${Date.now()}`,
            type: 'ai',
            author: 'Galent AI',
            content: data.response,
            timestamp: new Date(),
          }]);
        },
      }
    );
  };

  const addDoc = () => {
    if (!docForm.name) return;
    setDocs(prev => [...prev, {
      id: `doc-${Date.now()}`,
      name: docForm.name,
      type: docForm.type,
      status: 'draft',
      sharedWith: [],
      uploadedAt: new Date(),
    }]);
    setMessages(prev => [...prev, {
      id: `sys-doc-${Date.now()}`,
      type: 'system',
      author: 'System',
      content: `Document added: ${docForm.name}`,
      timestamp: new Date(),
    }]);
    setShowDocUpload(false);
    setDocForm({ name: '', type: 'other' });
  };

  const shareDoc = (docId: string) => {
    setDocs(prev => prev.map(d =>
      d.id === docId ? { ...d, status: 'shared', sharedWith: [customerName] } : d
    ));
    const doc = docs.find(d => d.id === docId);
    setMessages(prev => [...prev, {
      id: `sys-share-${Date.now()}`,
      type: 'system',
      author: 'System',
      content: `${doc?.name} shared with ${customerName}`,
      timestamp: new Date(),
    }]);
  };

  const DOC_TYPE_COLORS: Record<string, string> = {
    proposal: 'bg-[#7c3aed]/10 text-[#7c3aed]',
    sow: 'bg-emerald-500/10 text-emerald-400',
    contract: 'bg-blue-500/10 text-blue-400',
    presentation: 'bg-amber-500/10 text-amber-400',
    other: 'bg-secondary text-muted-foreground',
  };

  const STATUS_ICONS: Record<string, { icon: any; color: string }> = {
    draft: { icon: FileText, color: 'text-muted-foreground' },
    shared: { icon: Globe, color: 'text-blue-400' },
    viewed: { icon: Eye, color: 'text-amber-400' },
    signed: { icon: CheckCircle, color: 'text-emerald-400' },
  };

  return (
    <div className="space-y-4">
      {/* Section tabs */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary/40 w-fit">
        {[
          { id: 'chat' as const, label: 'Team Chat', icon: MessageCircle },
          { id: 'docs' as const, label: `Documents (${docs.length})`, icon: FileText },
          { id: 'portal' as const, label: 'Client Portal', icon: Globe },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveSection(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-medium transition-colors ${
              activeSection === tab.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}>
            <tab.icon className="h-3 w-3" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Chat section */}
      {activeSection === 'chat' && (
        <div className="space-y-3">
          <div className="max-h-[300px] overflow-y-auto space-y-2 p-3 rounded-xl bg-secondary/20 border border-border">
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-2 ${msg.type === 'system' ? 'justify-center' : ''}`}>
                {msg.type === 'system' ? (
                  <div className="text-[9px] text-muted-foreground italic py-1">{msg.content}</div>
                ) : (
                  <>
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[9px] font-bold ${
                      msg.type === 'ai' ? 'bg-[#7c3aed]/15 text-[#7c3aed]' : 'bg-secondary text-muted-foreground'
                    }`}>
                      {msg.type === 'ai' ? <Sparkles className="h-3 w-3" /> : msg.author[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium text-foreground">{msg.author}</span>
                        <span className="text-[9px] text-muted-foreground">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="text-xs text-foreground/80 mt-0.5">{msg.content}</div>
                    </div>
                  </>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Message the deal team..."
              className="flex-1 px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#7c3aed]/40" />
            <button onClick={handleSend} disabled={!input.trim() || chatMutation.isPending}
              className="p-2 rounded-lg bg-[#7c3aed] text-white disabled:opacity-40">
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Documents section */}
      {activeSection === 'docs' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setShowDocUpload(!showDocUpload)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#7c3aed] text-white text-[10px] font-medium hover:bg-[#6d28d9]">
              <Plus className="h-3 w-3" /> Add Document
            </button>
          </div>

          {showDocUpload && (
            <div className="p-3 rounded-lg bg-secondary/30 border border-border space-y-2 animate-flow-in">
              <input value={docForm.name} onChange={e => setDocForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Document name" className="w-full px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground" />
              <div className="flex gap-2">
                <select value={docForm.type} onChange={e => setDocForm(p => ({ ...p, type: e.target.value as any }))}
                  className="px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground">
                  <option value="proposal">Proposal</option>
                  <option value="sow">SOW</option>
                  <option value="contract">Contract</option>
                  <option value="presentation">Presentation</option>
                  <option value="other">Other</option>
                </select>
                <button onClick={addDoc} disabled={!docForm.name}
                  className="px-3 py-1.5 rounded-lg bg-[#7c3aed] text-white text-[10px] font-medium disabled:opacity-50">Add</button>
                <button onClick={() => setShowDocUpload(false)} className="text-[10px] text-muted-foreground">Cancel</button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {docs.map(doc => {
              const statusConfig = STATUS_ICONS[doc.status] || STATUS_ICONS.draft;
              const StatusIcon = statusConfig.icon;
              return (
                <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                  <div className={`px-2 py-1 rounded text-[9px] font-medium ${DOC_TYPE_COLORS[doc.type]}`}>
                    {doc.type.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-foreground truncate">{doc.name}</div>
                    <div className="text-[9px] text-muted-foreground">
                      {doc.uploadedAt.toLocaleDateString()} · {doc.sharedWith.length > 0 ? `Shared with ${doc.sharedWith.join(', ')}` : 'Not shared'}
                    </div>
                  </div>
                  <StatusIcon className={`h-3.5 w-3.5 ${statusConfig.color}`} />
                  {doc.status === 'draft' && (
                    <button onClick={() => shareDoc(doc.id)}
                      className="text-[10px] text-[#7c3aed] hover:underline flex items-center gap-1">
                      <Globe className="h-3 w-3" /> Share
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Client portal preview */}
      {activeSection === 'portal' && (
        <div className="space-y-3">
          <div className="p-5 rounded-xl bg-secondary/20 border border-border text-center">
            <Globe className="h-10 w-10 text-[#7c3aed] mx-auto mb-3 opacity-50" />
            <div className="text-sm font-medium text-foreground">Client Micro-Portal</div>
            <div className="text-[10px] text-muted-foreground mt-1 max-w-sm mx-auto">
              A shareable link where {customerName} can view shared documents, track proposal status, and leave comments — all without needing a login.
            </div>
            <div className="flex items-center justify-center gap-2 mt-4">
              <div className="px-3 py-2 rounded-lg bg-card border border-border text-xs text-muted-foreground font-mono">
                galent.io/portal/{opportunityId.slice(0, 8)}
              </div>
              <button className="px-3 py-2 rounded-lg bg-[#7c3aed] text-white text-xs font-medium hover:bg-[#6d28d9]">
                Copy Link
              </button>
            </div>
            <div className="mt-4 flex justify-center gap-4 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Secure & encrypted</span>
              <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> View tracking</span>
              <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {docs.filter(d => d.status !== 'draft').length} docs shared</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
