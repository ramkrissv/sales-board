'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  Mail, Sparkles, Loader2, Copy, CheckCircle, RefreshCw,
  ChevronDown, Send, X, Wand2,
} from 'lucide-react';

interface AIEmailComposerProps {
  opportunityId: string;
  customerName: string;
  dealStage: string;
  stakeholders: any[];
  onClose?: () => void;
}

const EMAIL_TEMPLATES = [
  { id: 'followup', label: 'Follow-up', prompt: 'Write a professional follow-up email' },
  { id: 'intro', label: 'Introduction', prompt: 'Write an introduction email for first contact' },
  { id: 'proposal', label: 'Proposal Cover', prompt: 'Write a proposal submission cover email' },
  { id: 'meeting', label: 'Meeting Request', prompt: 'Write a meeting request email' },
  { id: 'check_in', label: 'Check-in', prompt: 'Write a friendly check-in email to maintain engagement' },
  { id: 'close', label: 'Close Push', prompt: 'Write a closing nudge email to move toward contract signing' },
] as const;

const TONE_OPTIONS = [
  { id: 'professional', label: 'Professional' },
  { id: 'friendly', label: 'Friendly' },
  { id: 'urgent', label: 'Urgent' },
  { id: 'consultative', label: 'Consultative' },
] as const;

export default function AIEmailComposer({ opportunityId, customerName, dealStage, stakeholders, onClose }: AIEmailComposerProps) {
  const [template, setTemplate] = useState('followup');
  const [tone, setTone] = useState('professional');
  const [customInstructions, setCustomInstructions] = useState('');
  const [recipient, setRecipient] = useState(() => {
    const dm = stakeholders.find((s: any) => s.isDecisionMaker);
    const primary = stakeholders.find((s: any) => s.isPrimaryContact);
    return (dm || primary || stakeholders[0])?.name || '';
  });
  const [generatedEmail, setGeneratedEmail] = useState<{ subject: string; body: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showVariant, setShowVariant] = useState(false);
  const [variant, setVariant] = useState<{ subject: string; body: string } | null>(null);

  const chatMutation = trpc.ai.chat.useMutation();

  const handleGenerate = (isVariant = false) => {
    const selectedTemplate = EMAIL_TEMPLATES.find(t => t.id === template);
    const recipientInfo = stakeholders.find((s: any) => s.name === recipient);

    const prompt = `${selectedTemplate?.prompt} for the following deal:

Customer: ${customerName}
Stage: ${dealStage}
Recipient: ${recipient}${recipientInfo ? ` (${recipientInfo.title})${recipientInfo.isDecisionMaker ? ' [Decision Maker]' : ''}` : ''}
Tone: ${tone}
${customInstructions ? `Additional instructions: ${customInstructions}` : ''}
${isVariant ? 'Generate an ALTERNATIVE version — different angle, different opening, different CTA.' : ''}

Return ONLY valid JSON:
{
  "subject": "<email subject line>",
  "body": "<full email body, use \\n for line breaks. Do NOT use markdown. Include greeting, body paragraphs, and sign-off. Be specific to the deal context.>"
}`;

    chatMutation.mutate(
      { message: prompt, context: { opportunityId, page: 'email-composer' } },
      {
        onSuccess: (data) => {
          try {
            const jsonMatch = data.response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              if (isVariant) {
                setVariant(parsed);
                setShowVariant(true);
              } else {
                setGeneratedEmail(parsed);
                setVariant(null);
                setShowVariant(false);
              }
            }
          } catch {
            const lines = data.response.split('\n');
            const result = {
              subject: `Follow-up: ${customerName}`,
              body: data.response,
            };
            if (isVariant) {
              setVariant(result);
              setShowVariant(true);
            } else {
              setGeneratedEmail(result);
            }
          }
        },
      }
    );
  };

  const handleCopy = (email: { subject: string; body: string }) => {
    navigator.clipboard.writeText(`Subject: ${email.subject}\n\n${email.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#7c3aed]/15 flex items-center justify-center">
            <Mail className="h-3.5 w-3.5 text-[#7c3aed]" />
          </div>
          <span className="text-xs font-semibold text-foreground">AI Email Composer</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-3">
        {/* Template */}
        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Template</label>
          <div className="flex flex-wrap gap-1">
            {EMAIL_TEMPLATES.map(t => (
              <button key={t.id} onClick={() => setTemplate(t.id)}
                className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
                  template === t.id
                    ? 'bg-[#7c3aed]/10 text-[#7c3aed] border border-[#7c3aed]/30'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tone */}
        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Tone</label>
          <div className="flex flex-wrap gap-1">
            {TONE_OPTIONS.map(t => (
              <button key={t.id} onClick={() => setTone(t.id)}
                className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
                  tone === t.id
                    ? 'bg-[#7c3aed]/10 text-[#7c3aed] border border-[#7c3aed]/30'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recipient */}
      <div>
        <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Recipient</label>
        <select
          value={recipient}
          onChange={e => setRecipient(e.target.value)}
          className="w-full px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:border-[#7c3aed]/40"
        >
          {stakeholders.map((s: any) => (
            <option key={s.id || s.name} value={s.name}>
              {s.name} — {s.title}{s.isDecisionMaker ? ' (DM)' : ''}{s.isPrimaryContact ? ' (Primary)' : ''}
            </option>
          ))}
          <option value={customerName}>{customerName} (General)</option>
        </select>
      </div>

      {/* Custom instructions */}
      <div>
        <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Custom Instructions (optional)</label>
        <input
          type="text"
          value={customInstructions}
          onChange={e => setCustomInstructions(e.target.value)}
          placeholder="e.g. Mention the Q3 deadline, reference last meeting..."
          className="w-full px-3 py-2 text-xs bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#7c3aed]/40"
        />
      </div>

      {/* Generate button */}
      <button
        onClick={() => handleGenerate(false)}
        disabled={chatMutation.isPending}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#7c3aed] text-white text-xs font-medium hover:bg-[#6d28d9] disabled:opacity-50 transition-colors"
      >
        {chatMutation.isPending && !showVariant ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Composing...</>
        ) : (
          <><Wand2 className="h-3.5 w-3.5" /> Compose Email</>
        )}
      </button>

      {/* Generated email */}
      {generatedEmail && (
        <div className="space-y-3 animate-flow-in">
          <EmailPreview
            email={generatedEmail}
            label="Version A"
            onCopy={() => handleCopy(generatedEmail)}
            copied={copied && !showVariant}
          />

          {/* A/B variant */}
          {variant && showVariant && (
            <EmailPreview
              email={variant}
              label="Version B"
              onCopy={() => handleCopy(variant)}
              copied={copied && showVariant}
            />
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleGenerate(true)}
              disabled={chatMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:border-[#7c3aed]/30 transition-all"
            >
              {chatMutation.isPending && showVariant ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              A/B Variant
            </button>
            <button
              onClick={() => handleGenerate(false)}
              disabled={chatMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:border-[#7c3aed]/30 transition-all"
            >
              <RefreshCw className="h-3 w-3" /> Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EmailPreview({ email, label, onCopy, copied }: { email: { subject: string; body: string }; label: string; onCopy: () => void; copied: boolean }) {
  return (
    <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-[#7c3aed] uppercase tracking-wider">{label}</span>
        <button onClick={onCopy} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-muted-foreground hover:text-foreground bg-card border border-border hover:border-[#7c3aed]/30 transition-all">
          {copied ? <CheckCircle className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="text-xs font-medium text-foreground">
        Subject: {email.subject}
      </div>
      <div className="text-xs text-foreground/80 leading-relaxed whitespace-pre-line border-t pt-2" style={{ borderColor: 'var(--g-line)' }}>
        {email.body}
      </div>
    </div>
  );
}
