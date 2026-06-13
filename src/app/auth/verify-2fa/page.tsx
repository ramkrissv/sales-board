'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, Loader2, CheckCircle, AlertTriangle, Smartphone } from 'lucide-react';
import { Suspense } from 'react';

function Verify2FAContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const [mode, setMode] = useState<'checking' | 'verify' | 'setup' | 'done'>('checking');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const email = session?.user?.email || '';

  // Check if user has 2FA enabled
  useEffect(() => {
    if (!email) return;
    fetch('/api/auth/totp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'check', email }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.hasTotp) {
          setMode('verify');
          setTimeout(() => inputRef.current?.focus(), 100);
        } else {
          // No 2FA — skip straight through
          router.replace(callbackUrl);
        }
      })
      .catch(() => router.replace(callbackUrl));
  }, [email]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleVerify = async () => {
    if (code.length !== 6) return;
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth/totp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'validate', email, token: code }),
    });
    const data = await res.json();
    setLoading(false);

    if (data.valid) {
      setMode('done');
      // Store 2FA verified flag in sessionStorage
      sessionStorage.setItem('2fa_verified', Date.now().toString());
      setTimeout(() => router.replace(callbackUrl), 500);
    } else {
      setError('Invalid code. Check your authenticator app and try again.');
      setCode('');
      inputRef.current?.focus();
    }
  };

  const handleSetup = async () => {
    setLoading(true);
    const res = await fetch('/api/auth/totp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'setup', email }),
    });
    const data = await res.json();
    setLoading(false);

    if (data.alreadyEnabled) {
      setMode('verify');
      return;
    }

    setQrCode(data.qrCode);
    setSecret(data.secret);
    setMode('setup');
  };

  const handleConfirmSetup = async () => {
    if (code.length !== 6) return;
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth/totp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify', email, token: code }),
    });
    const data = await res.json();
    setLoading(false);

    if (data.valid) {
      setMode('done');
      sessionStorage.setItem('2fa_verified', Date.now().toString());
      setTimeout(() => router.replace(callbackUrl), 1000);
    } else {
      setError('Invalid code. Make sure you scanned the correct QR code.');
      setCode('');
    }
  };

  if (mode === 'checking') {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-[#7c3aed]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {mode === 'verify' && (
        <>
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#7c3aed]/10 flex items-center justify-center mx-auto mb-3">
              <Smartphone className="h-7 w-7 text-[#7c3aed]" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Two-Factor Authentication</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>

          <div className="flex justify-center">
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleVerify()}
              placeholder="000000"
              className="w-48 text-center text-2xl font-mono tracking-[0.5em] px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-[#7c3aed]"
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-center justify-center gap-2 text-red-500 text-sm">
              <AlertTriangle className="h-4 w-4" /> {error}
            </div>
          )}

          <button onClick={handleVerify} disabled={loading || code.length !== 6}
            className="w-full px-4 py-3 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
            Verify
          </button>
        </>
      )}

      {mode === 'setup' && (
        <>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Set Up Authenticator</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Scan this QR code with Google Authenticator or Microsoft Authenticator
            </p>
          </div>

          {qrCode && (
            <div className="flex justify-center">
              <img src={qrCode} alt="2FA QR Code" className="w-48 h-48 rounded-xl" />
            </div>
          )}

          <div className="text-center">
            <p className="text-[11px] text-slate-400">Can't scan? Enter manually:</p>
            <code className="text-xs font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg select-all">{secret}</code>
          </div>

          <div className="flex justify-center">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleConfirmSetup()}
              placeholder="Enter code to verify"
              className="w-48 text-center text-xl font-mono tracking-[0.3em] px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-[#7c3aed]"
            />
          </div>

          {error && (
            <div className="flex items-center justify-center gap-2 text-red-500 text-sm">
              <AlertTriangle className="h-4 w-4" /> {error}
            </div>
          )}

          <button onClick={handleConfirmSetup} disabled={loading || code.length !== 6}
            className="w-full px-4 py-3 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Verify & Enable 2FA
          </button>
        </>
      )}

      {mode === 'done' && (
        <div className="text-center space-y-3">
          <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Verified</h2>
          <p className="text-sm text-slate-500">Redirecting...</p>
        </div>
      )}
    </div>
  );
}

export default function Verify2FAPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950/20">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">SalesPilot</h1>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-lg">
          <Suspense fallback={<div className="flex justify-center h-32"><Loader2 className="h-6 w-6 animate-spin text-[#7c3aed]" /></div>}>
            <Verify2FAContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
