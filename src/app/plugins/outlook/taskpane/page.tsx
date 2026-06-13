'use client';

import { useState, useEffect } from 'react';
import { Send, Loader2, CheckCircle, AlertTriangle, ArrowRight, ExternalLink, Sparkles } from 'lucide-react';

/**
 * Outlook Add-in Taskpane — runs inside Outlook sidebar
 * Captures email content, sends to SalesPilot AI for processing,
 * shows results: deal match, signals, action items, tasks created
 */

interface AIResult {
  matched: boolean;
  dealName?: string;
  intent?: string;
  summary?: string;
  actionItems?: string[];
  tasksCreated?: number;
  urgency?: string;
  sentiment?: string;
}

export default function OutlookTaskpane() {
  const [status, setStatus] = useState<'idle' | 'capturing' | 'sending' | 'sent' | 'error'>('idle');
  const [emailData, setEmailData] = useState({ subject: '', from: '', body: '', to: '' });
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [autoCapture, setAutoCapture] = useState(false);

  // Auto-capture email data from Office.js when running in Outlook
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).Office) {
      (window as any).Office.onReady(() => {
        try {
          const item = (window as any).Office.context.mailbox.item;
          if (item) {
            const captured = {
              subject: item.subject || '',
              from: item.from?.emailAddress || item.sender?.emailAddress || '',
              to: item.to?.map((t: any) => t.emailAddress).join(', ') || '',
              body: '',
            };
            // Get body text
            item.body.getAsync('text', (result: any) => {
              if (result.status === 'succeeded') {
                captured.body = (result.value || '').slice(0, 2000);
              }
              setEmailData(captured);
              setAutoCapture(true);
            });
          }
        } catch { /* Not in Outlook context */ }
      });
    }
  }, []);

  const handleSend = async () => {
    setStatus('sending');
    setAiResult(null);
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const res = await fetch(`${baseUrl}/api/webhooks/outlook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailData),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus('sent');
        setAiResult(data.result);
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setAiResult(null);
    if (!autoCapture) setEmailData({ subject: '', from: '', body: '', to: '' });
  };

  const sentimentColor = aiResult?.sentiment === 'positive' ? '#22c55e' :
                          aiResult?.sentiment === 'negative' ? '#ef4444' : '#3b82f6';

  const urgencyColor = aiResult?.urgency === 'high' ? '#ef4444' :
                        aiResult?.urgency === 'medium' ? '#f59e0b' : '#71717a';

  return (
    <div className="p-4 max-w-sm mx-auto space-y-4" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: '13px', color: '#1a1a2e' }}>
      {/* Header */}
      <div className="flex items-center gap-2 pb-2" style={{ borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles style={{ width: 14, height: 14, color: 'white' }} />
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>SalesPilot</div>
          <div style={{ fontSize: 10, color: '#999' }}>AI Signal Capture</div>
        </div>
      </div>

      {/* Input Form */}
      {status !== 'sent' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input value={emailData.subject} onChange={e => setEmailData(p => ({ ...p, subject: e.target.value }))}
            placeholder="Subject"
            style={{ width: '100%', padding: '8px 10px', fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 6, outline: 'none' }} />
          <input value={emailData.from} onChange={e => setEmailData(p => ({ ...p, from: e.target.value }))}
            placeholder="From (email)"
            style={{ width: '100%', padding: '8px 10px', fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 6, outline: 'none' }} />
          <textarea value={emailData.body} onChange={e => setEmailData(p => ({ ...p, body: e.target.value }))}
            placeholder="Paste email content or key notes..."
            rows={5}
            style={{ width: '100%', padding: '8px 10px', fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 6, resize: 'none', outline: 'none' }} />

          <button onClick={handleSend}
            disabled={status === 'sending' || !emailData.subject}
            style={{
              width: '100%', padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: '#7c3aed', color: 'white', fontWeight: 600, fontSize: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              opacity: (status === 'sending' || !emailData.subject) ? 0.5 : 1,
            }}>
            {status === 'sending' ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> : <Send style={{ width: 14, height: 14 }} />}
            {status === 'sending' ? 'AI Processing...' : 'Send to SalesPilot'}
          </button>

          {status === 'error' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#ef4444', fontSize: 11 }}>
              <AlertTriangle style={{ width: 12, height: 12 }} /> Failed. Check connection and try again.
            </div>
          )}
        </div>
      )}

      {/* AI Result */}
      {status === 'sent' && aiResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Success header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#22c55e', fontSize: 12, fontWeight: 600 }}>
            <CheckCircle style={{ width: 14, height: 14 }} /> Captured & Processed
          </div>

          {/* Deal match */}
          {aiResult.matched && aiResult.dealName && (
            <div style={{ padding: '10px 12px', borderRadius: 8, background: '#7c3aed10', border: '1px solid #7c3aed30' }}>
              <div style={{ fontSize: 10, color: '#7c3aed', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Matched Deal</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{aiResult.dealName}</div>
            </div>
          )}

          {!aiResult.matched && (
            <div style={{ padding: '10px 12px', borderRadius: 8, background: '#f59e0b10', border: '1px solid #f59e0b30' }}>
              <div style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600 }}>No deal match — logged as new signal</div>
            </div>
          )}

          {/* Summary */}
          {aiResult.summary && (
            <div style={{ fontSize: 12, color: '#444', lineHeight: 1.5 }}>
              {aiResult.summary}
            </div>
          )}

          {/* Badges */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {aiResult.intent && (
              <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 12, background: '#3b82f610', color: '#3b82f6', fontWeight: 600 }}>
                {aiResult.intent.replace('_', ' ')}
              </span>
            )}
            {aiResult.sentiment && (
              <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 12, background: `${sentimentColor}10`, color: sentimentColor, fontWeight: 600 }}>
                {aiResult.sentiment}
              </span>
            )}
            {aiResult.urgency && (
              <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 12, background: `${urgencyColor}10`, color: urgencyColor, fontWeight: 600 }}>
                {aiResult.urgency} urgency
              </span>
            )}
          </div>

          {/* Action items */}
          {aiResult.actionItems && aiResult.actionItems.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                Action Items {aiResult.tasksCreated ? `(${aiResult.tasksCreated} tasks created)` : ''}
              </div>
              {aiResult.actionItems.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '4px 0', fontSize: 12 }}>
                  <ArrowRight style={{ width: 10, height: 10, marginTop: 3, color: '#7c3aed', flexShrink: 0 }} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}

          {/* Open in SalesPilot */}
          <a href="https://salespilot.galent.ai" target="_blank" rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '8px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12,
              fontWeight: 500, color: '#7c3aed', textDecoration: 'none', cursor: 'pointer',
            }}>
            <ExternalLink style={{ width: 12, height: 12 }} /> Open SalesPilot
          </a>

          {/* Capture another */}
          <button onClick={handleReset}
            style={{ fontSize: 11, color: '#999', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center' }}>
            Capture another email
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
