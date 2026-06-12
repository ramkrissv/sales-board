'use client';

import { useState } from 'react';
import { Sparkles, Send, Loader2, CheckCircle } from 'lucide-react';

/**
 * Outlook Add-in Taskpane — runs inside Outlook sidebar
 * Captures email content and sends to SalesPilot for AI processing
 */
export default function OutlookTaskpane() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [emailData, setEmailData] = useState({ subject: '', from: '', body: '', to: '' });

  const handleCapture = async () => {
    // Try to get email data from Office.js (when running in Outlook)
    try {
      if (typeof window !== 'undefined' && (window as any).Office) {
        const item = (window as any).Office.context.mailbox.item;
        setEmailData({
          subject: item.subject || '',
          from: item.from?.emailAddress || '',
          body: '', // Would need item.body.getAsync
          to: item.to?.map((t: any) => t.emailAddress).join(', ') || '',
        });
      }
    } catch { /* Not in Outlook context */ }
  };

  const handleSend = async () => {
    setStatus('sending');
    try {
      const res = await fetch('/api/webhooks/outlook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailData),
      });
      if (res.ok) setStatus('sent');
      else setStatus('error');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="p-4 max-w-sm mx-auto space-y-4" style={{ fontFamily: 'Segoe UI, system-ui, sans-serif' }}>
      <div className="flex items-center gap-2">
        <img src="/galent-logo.svg" alt="Galent" className="w-8 h-8 rounded-lg" />
        <div>
          <div className="text-sm font-semibold">SalesPilot</div>
          <div className="text-[10px] text-gray-500">Send to pipeline</div>
        </div>
      </div>

      <div className="space-y-2">
        <input value={emailData.subject} onChange={e => setEmailData(p => ({ ...p, subject: e.target.value }))}
          placeholder="Subject" className="w-full px-3 py-2 text-sm border rounded-lg" />
        <input value={emailData.from} onChange={e => setEmailData(p => ({ ...p, from: e.target.value }))}
          placeholder="From" className="w-full px-3 py-2 text-sm border rounded-lg" />
        <textarea value={emailData.body} onChange={e => setEmailData(p => ({ ...p, body: e.target.value }))}
          placeholder="Paste email content or key notes..." rows={5}
          className="w-full px-3 py-2 text-sm border rounded-lg resize-none" />
      </div>

      {status === 'sent' ? (
        <div className="flex items-center gap-2 text-green-600 text-sm">
          <CheckCircle className="h-4 w-4" /> Captured in SalesPilot!
        </div>
      ) : (
        <button onClick={handleSend} disabled={status === 'sending' || !emailData.subject}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#7c3aed] text-white text-sm font-medium disabled:opacity-50">
          {status === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {status === 'sending' ? 'Sending...' : 'Send to SalesPilot'}
        </button>
      )}

      {status === 'error' && (
        <p className="text-xs text-red-500">Failed to send. Try again.</p>
      )}

      <p className="text-[10px] text-gray-400 text-center">
        AI will extract deal signals, log activity, and suggest next steps.
      </p>
    </div>
  );
}
