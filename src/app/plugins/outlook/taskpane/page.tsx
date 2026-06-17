'use client';

import { useState, useEffect } from 'react';
import { Send, Loader2, CheckCircle, AlertTriangle, ArrowRight, ExternalLink, Sparkles, Mail, User, FileText, Zap } from 'lucide-react';

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
  const [status, setStatus] = useState<'idle' | 'loading' | 'sending' | 'sent' | 'error'>('idle');
  const [emailData, setEmailData] = useState({ subject: '', from: '', body: '', to: '' });
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [officeReady, setOfficeReady] = useState(false);

  // Auto-capture email from Office.js
  useEffect(() => {
    setStatus('loading');
    if (typeof window !== 'undefined' && (window as any).Office) {
      (window as any).Office.onReady(() => {
        try {
          const item = (window as any).Office.context.mailbox.item;
          if (item) {
            const data = {
              subject: item.subject || '',
              from: item.from?.emailAddress || item.sender?.emailAddress || '',
              to: item.to?.map((t: any) => t.emailAddress).join(', ') || '',
              body: '',
            };
            item.body.getAsync('text', (result: any) => {
              if (result.status === 'succeeded') {
                data.body = (result.value || '').slice(0, 3000);
              }
              setEmailData(data);
              setOfficeReady(true);
              setStatus('idle');
            });
          } else {
            setStatus('idle');
          }
        } catch {
          setStatus('idle');
        }
      });
    } else {
      // Not in Office context — manual mode
      setStatus('idle');
    }
  }, []);

  const handleSend = async () => {
    setStatus('sending');
    setAiResult(null);
    try {
      const res = await fetch('/api/webhooks/outlook', {
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
  };

  const s = { fontFamily: "'Segoe UI', system-ui, sans-serif" };
  const sentimentColor = aiResult?.sentiment === 'positive' ? '#22c55e' : aiResult?.sentiment === 'negative' ? '#ef4444' : '#3b82f6';
  const urgencyColor = aiResult?.urgency === 'high' ? '#ef4444' : aiResult?.urgency === 'medium' ? '#f59e0b' : '#71717a';

  if (status === 'loading') {
    return (
      <div style={{ ...s, padding: 32, textAlign: 'center' }}>
        <Loader2 style={{ width: 24, height: 24, color: '#7c3aed', margin: '0 auto', animation: 'spin 1s linear infinite' }} />
        <p style={{ fontSize: 13, color: '#888', marginTop: 12 }}>Reading email...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ ...s, padding: 16, maxWidth: 400, margin: '0 auto', fontSize: 13, color: '#1a1a2e' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 12, borderBottom: '1px solid #e5e7eb', marginBottom: 16 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles style={{ width: 16, height: 16, color: 'white' }} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>SalesPilot</div>
          <div style={{ fontSize: 11, color: '#999' }}>AI Signal Capture</div>
        </div>
      </div>

      {/* Pre-send: Show email summary + actions */}
      {status === 'idle' && !aiResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Auto-captured email info */}
          {emailData.subject && (
            <div style={{ padding: 12, borderRadius: 10, background: '#f8f8fc', border: '1px solid #e8e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Mail style={{ width: 12, height: 12, color: '#7c3aed' }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: '#7c3aed' }}>Email Detected</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{emailData.subject}</div>
              <div style={{ fontSize: 11, color: '#666' }}>From: {emailData.from}</div>
              {emailData.to && <div style={{ fontSize: 11, color: '#666' }}>To: {emailData.to}</div>}
              {emailData.body && (
                <div style={{ fontSize: 11, color: '#888', marginTop: 6, maxHeight: 80, overflow: 'hidden' }}>
                  {emailData.body.slice(0, 200)}...
                </div>
              )}
            </div>
          )}

          {/* Manual entry if no email detected */}
          {!emailData.subject && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input value={emailData.subject} onChange={e => setEmailData(p => ({ ...p, subject: e.target.value }))}
                placeholder="Subject" style={{ width: '100%', padding: '8px 10px', fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none' }} />
              <input value={emailData.from} onChange={e => setEmailData(p => ({ ...p, from: e.target.value }))}
                placeholder="From" style={{ width: '100%', padding: '8px 10px', fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 8, outline: 'none' }} />
              <textarea value={emailData.body} onChange={e => setEmailData(p => ({ ...p, body: e.target.value }))}
                placeholder="Paste email content..." rows={4}
                style={{ width: '100%', padding: '8px 10px', fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 8, resize: 'none', outline: 'none' }} />
            </div>
          )}

          {/* Quick actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={handleSend} disabled={!emailData.subject}
              style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer',
                background: '#7c3aed', color: 'white', fontWeight: 600, fontSize: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: !emailData.subject ? 0.5 : 1 }}>
              <Zap style={{ width: 14, height: 14 }} /> Capture Signal & Process with AI
            </button>

            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => { setEmailData(p => ({ ...p, body: p.body + '\n[Flag as follow-up required]' })); handleSend(); }}
                disabled={!emailData.subject}
                style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'pointer',
                  background: 'white', fontSize: 11, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  opacity: !emailData.subject ? 0.5 : 1 }}>
                <ArrowRight style={{ width: 10, height: 10 }} /> Follow-up
              </button>
              <button onClick={() => { setEmailData(p => ({ ...p, body: p.body + '\n[Log as meeting notes]' })); handleSend(); }}
                disabled={!emailData.subject}
                style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'pointer',
                  background: 'white', fontSize: 11, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  opacity: !emailData.subject ? 0.5 : 1 }}>
                <FileText style={{ width: 10, height: 10 }} /> Meeting Notes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sending */}
      {status === 'sending' && (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Loader2 style={{ width: 28, height: 28, color: '#7c3aed', margin: '0 auto', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontSize: 13, color: '#666', marginTop: 12 }}>AI is analyzing this email...</p>
          <p style={{ fontSize: 11, color: '#999', marginTop: 4 }}>Matching to deals, extracting signals</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {/* Results */}
      {status === 'sent' && aiResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#22c55e', fontSize: 13, fontWeight: 600 }}>
            <CheckCircle style={{ width: 16, height: 16 }} /> Signal Captured
          </div>

          {aiResult.matched && aiResult.dealName && (
            <div style={{ padding: 12, borderRadius: 10, background: '#7c3aed10', border: '1px solid #7c3aed30' }}>
              <div style={{ fontSize: 10, color: '#7c3aed', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Deal Match</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{aiResult.dealName}</div>
            </div>
          )}
          {!aiResult.matched && (
            <div style={{ padding: 10, borderRadius: 8, background: '#f59e0b10', border: '1px solid #f59e0b30', fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>
              No deal match — logged as new signal for review
            </div>
          )}

          {aiResult.summary && <div style={{ fontSize: 12, color: '#444', lineHeight: 1.6 }}>{aiResult.summary}</div>}

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {aiResult.intent && <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 12, background: '#3b82f610', color: '#3b82f6', fontWeight: 600 }}>{aiResult.intent.replace('_', ' ')}</span>}
            {aiResult.sentiment && <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 12, background: `${sentimentColor}10`, color: sentimentColor, fontWeight: 600 }}>{aiResult.sentiment}</span>}
            {aiResult.urgency && <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 12, background: `${urgencyColor}10`, color: urgencyColor, fontWeight: 600 }}>{aiResult.urgency}</span>}
            {aiResult.tasksCreated ? <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 12, background: '#22c55e10', color: '#22c55e', fontWeight: 600 }}>{aiResult.tasksCreated} tasks created</span> : null}
          </div>

          {aiResult.actionItems && aiResult.actionItems.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Action Items</div>
              {aiResult.actionItems.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '4px 0', fontSize: 12 }}>
                  <CheckCircle style={{ width: 10, height: 10, marginTop: 3, color: '#7c3aed', flexShrink: 0 }} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}

          <a href="https://salespilot.galent.ai" target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: 10, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12,
              fontWeight: 500, color: '#7c3aed', textDecoration: 'none' }}>
            <ExternalLink style={{ width: 12, height: 12 }} /> Open in SalesPilot
          </a>

          <button onClick={handleReset} style={{ fontSize: 11, color: '#999', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center' }}>
            Capture another email
          </button>
        </div>
      )}

      {status === 'error' && (
        <div style={{ textAlign: 'center', padding: 16 }}>
          <AlertTriangle style={{ width: 24, height: 24, color: '#ef4444', margin: '0 auto' }} />
          <p style={{ fontSize: 13, color: '#ef4444', marginTop: 8 }}>Failed to process</p>
          <button onClick={() => setStatus('idle')} style={{ fontSize: 12, color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer', marginTop: 8 }}>Try again</button>
        </div>
      )}
    </div>
  );
}
