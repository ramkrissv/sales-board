'use client';

import { useState, useEffect } from 'react';

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

// All styles are inline with explicit light colors — no CSS variables, no dark mode
const bg = '#ffffff';
const cardBg = '#f8f9fc';
const border = '#e5e7eb';
const textPrimary = '#1a1a2e';
const textSecondary = '#666';
const textMuted = '#999';
const purple = '#7c3aed';
const green = '#22c55e';
const amber = '#f59e0b';
const red = '#ef4444';
const blue = '#3b82f6';

export default function OutlookTaskpane() {
  const [status, setStatus] = useState<'loading' | 'idle' | 'sending' | 'sent' | 'error'>('loading');
  const [emailData, setEmailData] = useState({ subject: '', from: '', body: '', to: '' });
  const [aiResult, setAiResult] = useState<AIResult | null>(null);

  useEffect(() => {
    // Force light theme on body
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = 'light';

    // Try Office.js
    const tryOffice = () => {
      try {
        const Office = (window as any).Office;
        if (Office) {
          Office.onReady(() => {
            try {
              const item = Office.context?.mailbox?.item;
              if (item) {
                const data: any = {
                  subject: item.subject || '',
                  from: item.from?.emailAddress || item.sender?.emailAddress || '',
                  to: (item.to || []).map?.((t: any) => t.emailAddress).join(', ') || '',
                  body: '',
                };
                try {
                  item.body.getAsync('text', (result: any) => {
                    if (result.status === 'succeeded') data.body = (result.value || '').slice(0, 3000);
                    setEmailData(data);
                    setStatus('idle');
                  });
                } catch {
                  setEmailData(data);
                  setStatus('idle');
                }
                return;
              }
            } catch {}
            setStatus('idle');
          });
          return;
        }
      } catch {}
      setStatus('idle');
    };

    // Give Office.js 2 seconds to load
    const timer = setTimeout(tryOffice, 500);
    if ((window as any).Office) tryOffice();
    return () => clearTimeout(timer);
  }, []);

  const handleSend = async (extraContext?: string) => {
    setStatus('sending');
    setAiResult(null);
    const payload = { ...emailData };
    if (extraContext) payload.body = (payload.body || '') + '\n' + extraContext;
    try {
      const baseUrl = window.location.origin;
      const res = await fetch(`${baseUrl}/api/webhooks/outlook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) { setStatus('sent'); setAiResult(data.result); }
      else setStatus('error');
    } catch { setStatus('error'); }
  };

  if (status === 'loading') {
    return (
      <div style={{ background: bg, padding: 32, textAlign: 'center', minHeight: '100vh' }}>
        <div style={{ width: 24, height: 24, border: `3px solid ${border}`, borderTopColor: purple, borderRadius: '50%', margin: '0 auto', animation: 'spin 1s linear infinite' }} />
        <p style={{ fontSize: 13, color: textMuted, marginTop: 12 }}>Reading email...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ background: bg, padding: 16, fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: 13, color: textPrimary, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 12, borderBottom: `1px solid ${border}`, marginBottom: 16 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: purple, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14 }}>S</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: textPrimary }}>SalesPilot</div>
          <div style={{ fontSize: 11, color: textMuted }}>AI Signal Capture</div>
        </div>
      </div>

      {/* Idle: show email + actions */}
      {status === 'idle' && !aiResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {emailData.subject ? (
            <div style={{ padding: 12, borderRadius: 10, background: cardBg, border: `1px solid ${border}` }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: purple, marginBottom: 6 }}>📧 Email Detected</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>{emailData.subject}</div>
              <div style={{ fontSize: 11, color: textSecondary, marginTop: 2 }}>From: {emailData.from}</div>
              {emailData.to && <div style={{ fontSize: 11, color: textSecondary }}>To: {emailData.to}</div>}
              {emailData.body && <div style={{ fontSize: 11, color: textMuted, marginTop: 6, maxHeight: 80, overflow: 'hidden' }}>{emailData.body.slice(0, 200)}...</div>}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input value={emailData.subject} onChange={e => setEmailData(p => ({ ...p, subject: e.target.value }))}
                placeholder="Subject" style={{ width: '100%', padding: '10px 12px', fontSize: 13, border: `1px solid ${border}`, borderRadius: 8, background: bg, color: textPrimary, outline: 'none' }} />
              <input value={emailData.from} onChange={e => setEmailData(p => ({ ...p, from: e.target.value }))}
                placeholder="From (email)" style={{ width: '100%', padding: '10px 12px', fontSize: 13, border: `1px solid ${border}`, borderRadius: 8, background: bg, color: textPrimary, outline: 'none' }} />
              <textarea value={emailData.body} onChange={e => setEmailData(p => ({ ...p, body: e.target.value }))}
                placeholder="Paste email content or key notes..." rows={5}
                style={{ width: '100%', padding: '10px 12px', fontSize: 13, border: `1px solid ${border}`, borderRadius: 8, background: bg, color: textPrimary, outline: 'none', resize: 'vertical' }} />
            </div>
          )}

          <button onClick={() => handleSend()} disabled={!emailData.subject}
            style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer',
              background: purple, color: 'white', fontWeight: 600, fontSize: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: !emailData.subject ? 0.5 : 1 }}>
            ⚡ Capture Signal & Process with AI
          </button>

          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => handleSend('[Flag: follow-up required]')} disabled={!emailData.subject}
              style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${border}`, cursor: 'pointer',
                background: bg, fontSize: 12, fontWeight: 500, color: textPrimary, opacity: !emailData.subject ? 0.5 : 1 }}>
              → Follow-up
            </button>
            <button onClick={() => handleSend('[Flag: meeting notes]')} disabled={!emailData.subject}
              style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${border}`, cursor: 'pointer',
                background: bg, fontSize: 12, fontWeight: 500, color: textPrimary, opacity: !emailData.subject ? 0.5 : 1 }}>
              📝 Meeting Notes
            </button>
          </div>
        </div>
      )}

      {/* Sending */}
      {status === 'sending' && (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <div style={{ width: 28, height: 28, border: `3px solid ${border}`, borderTopColor: purple, borderRadius: '50%', margin: '0 auto', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontSize: 13, color: textSecondary, marginTop: 12 }}>AI is analyzing...</p>
          <p style={{ fontSize: 11, color: textMuted, marginTop: 4 }}>Matching to deals, extracting signals</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {/* Results */}
      {status === 'sent' && aiResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: green, fontSize: 13, fontWeight: 600 }}>✅ Signal Captured</div>

          {aiResult.matched && aiResult.dealName ? (
            <div style={{ padding: 12, borderRadius: 10, background: `${purple}08`, border: `1px solid ${purple}30` }}>
              <div style={{ fontSize: 10, color: purple, fontWeight: 700, textTransform: 'uppercase' }}>Deal Match</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: textPrimary, marginTop: 2 }}>{aiResult.dealName}</div>
            </div>
          ) : (
            <div style={{ padding: 10, borderRadius: 8, background: `${amber}10`, border: `1px solid ${amber}30`, fontSize: 11, color: amber, fontWeight: 600 }}>
              No deal match — logged as new signal
            </div>
          )}

          {aiResult.summary && <div style={{ fontSize: 12, color: textSecondary, lineHeight: 1.6 }}>{aiResult.summary}</div>}

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {aiResult.intent && <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 12, background: `${blue}10`, color: blue, fontWeight: 600 }}>{aiResult.intent.replace('_', ' ')}</span>}
            {aiResult.sentiment && <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 12, background: `${aiResult.sentiment === 'positive' ? green : aiResult.sentiment === 'negative' ? red : blue}10`, color: aiResult.sentiment === 'positive' ? green : aiResult.sentiment === 'negative' ? red : blue, fontWeight: 600 }}>{aiResult.sentiment}</span>}
            {aiResult.urgency && <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 12, background: `${aiResult.urgency === 'high' ? red : aiResult.urgency === 'medium' ? amber : textMuted}10`, color: aiResult.urgency === 'high' ? red : aiResult.urgency === 'medium' ? amber : textMuted, fontWeight: 600 }}>{aiResult.urgency}</span>}
            {(aiResult.tasksCreated || 0) > 0 && <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 12, background: `${green}10`, color: green, fontWeight: 600 }}>{aiResult.tasksCreated} tasks</span>}
          </div>

          {aiResult.actionItems && aiResult.actionItems.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: textMuted, textTransform: 'uppercase', marginBottom: 6 }}>Action Items</div>
              {aiResult.actionItems.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '4px 0', fontSize: 12, color: textPrimary }}>
                  <span style={{ color: purple }}>→</span> {item}
                </div>
              ))}
            </div>
          )}

          <a href="https://salespilot.galent.ai" target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: 10, borderRadius: 8, border: `1px solid ${border}`, fontSize: 12,
              fontWeight: 500, color: purple, textDecoration: 'none' }}>
            🔗 Open in SalesPilot
          </a>

          <button onClick={() => { setStatus('idle'); setAiResult(null); }}
            style={{ fontSize: 11, color: textMuted, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center' }}>
            Capture another email
          </button>
        </div>
      )}

      {status === 'error' && (
        <div style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ fontSize: 24 }}>⚠️</div>
          <p style={{ fontSize: 13, color: red, marginTop: 8 }}>Failed to process</p>
          <button onClick={() => setStatus('idle')} style={{ fontSize: 12, color: purple, background: 'none', border: 'none', cursor: 'pointer', marginTop: 8 }}>Try again</button>
        </div>
      )}
    </div>
  );
}
