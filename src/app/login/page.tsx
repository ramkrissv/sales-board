'use client';

import { signIn } from 'next-auth/react';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Sparkles, Loader2 } from 'lucide-react';

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('admin@galent.com');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [team, setTeam] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isInIframe, setIsInIframe] = useState(false);
  const [teamsSSO, setTeamsSSO] = useState<'checking' | 'authenticating' | 'failed' | 'none'>('checking');

  const isAdminEmail = email.toLowerCase() === 'admin@galent.com';

  // Detect Teams context and attempt silent SSO
  useEffect(() => {
    let isIframe = false;
    try {
      isIframe = window.self !== window.top;
    } catch {
      isIframe = true;
    }
    setIsInIframe(isIframe);

    if (!isIframe) {
      setTeamsSSO('none');
      return;
    }

    // Try Teams SSO
    (async () => {
      try {
        const teamsSDK = await import('@microsoft/teams-js');
        await teamsSDK.app.initialize();
        setTeamsSSO('authenticating');

        // Get SSO token from Teams
        const token = await teamsSDK.authentication.getAuthToken();

        // Exchange token for SalesPilot session
        const res = await fetch('/api/auth/teams-sso', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();

        if (data.success && data.user?.email) {
          // Sign in with credentials using the Teams-authenticated email
          const result = await signIn('credentials', {
            email: data.user.email,
            password: '', // No password needed for Teams SSO users
            redirect: false,
          });
          if (!result?.error) {
            window.location.href = callbackUrl;
            return;
          }
        }
        setTeamsSSO('failed');
      } catch {
        // Not in Teams or SSO failed — show normal login
        setTeamsSSO('failed');
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Show loading while Teams SSO is in progress
  if (teamsSSO === 'checking' || teamsSSO === 'authenticating') {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 shadow-lg shadow-purple-500/5 flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#7c3aed]" />
        <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {teamsSSO === 'checking' ? 'Detecting environment...' : 'Signing in with Teams...'}
        </div>
        <div className="text-xs text-slate-400">Using your Microsoft Teams identity</div>
      </div>
    );
  }

  const handleDevLogin = async () => {
    setLoading(true);
    setError('');
    const result = await signIn('credentials', { email, password, callbackUrl, redirect: false });
    if (result?.error) {
      setError(isAdminEmail ? 'Invalid password' : 'Login failed');
      setLoading(false);
    } else {
      window.location.href = callbackUrl;
    }
  };

  const handleSignUp = async () => {
    if (!email) return;
    setLoading(true);
    await signIn('credentials', { email, name: `${firstName} ${lastName}`.trim() || email.split('@')[0], callbackUrl });
  };

  const handleAzureLogin = () => {
    if (isInIframe) {
      // Inside Teams/Outlook iframe — open auth in a popup window
      const width = 500;
      const height = 700;
      const left = (screen.width - width) / 2;
      const top = (screen.height - height) / 2;
      const authUrl = `/api/auth/signin/azure-ad?callbackUrl=${encodeURIComponent(callbackUrl)}`;
      const popup = window.open(
        authUrl,
        'SalesPilot Login',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
      );

      // Poll for popup close (indicates auth complete)
      const pollTimer = setInterval(() => {
        try {
          if (!popup || popup.closed) {
            clearInterval(pollTimer);
            // Auth completed — reload the iframe
            window.location.href = callbackUrl;
          }
        } catch {
          // cross-origin — popup still open
        }
      }, 500);
    } else {
      // Normal browser — standard redirect
      signIn('azure-ad', { callbackUrl });
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-lg shadow-purple-500/5 space-y-4">
      {/* Azure AD Login */}
      <button
        onClick={handleAzureLogin}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#0078d4] hover:bg-[#106ebe] text-white rounded-lg font-medium transition-colors disabled:opacity-50"
      >
        <svg className="h-5 w-5" viewBox="0 0 21 21" fill="currentColor">
          <path d="M0 0h10v10H0zm11 0h10v10H11zM0 11h10v10H0zm11 0h10v10H11z" />
        </svg>
        Sign in with Microsoft
        {isInIframe && <span className="text-[10px] opacity-70 ml-1">(popup)</span>}
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200 dark:border-slate-800" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white dark:bg-slate-900 px-2 text-slate-400">or</span>
        </div>
      </div>

      {/* Tab Toggle */}
      <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
        <button
          onClick={() => setActiveTab('signin')}
          className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'signin'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Sign In
        </button>
        <button
          onClick={() => setActiveTab('signup')}
          className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'signup'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Sign Up
        </button>
      </div>

      {/* Sign In Form */}
      {activeTab === 'signin' && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              placeholder="admin@galent.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleDevLogin()}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              placeholder="Enter password"
            />
          </div>
          {error && (
            <p className="text-xs text-red-500 text-center">{error}</p>
          )}
          <button
            onClick={handleDevLogin}
            disabled={loading}
            className="w-full px-4 py-2.5 bg-[#7c3aed] hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </div>
      )}

      {/* Sign Up Form */}
      {activeTab === 'signup' && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              placeholder="admin@galent.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                placeholder="First name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                placeholder="Last name"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Team <span className="text-slate-400">(optional)</span></label>
            <input
              type="text"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              placeholder="e.g. Sales, Engineering"
            />
          </div>
          <button
            onClick={handleSignUp}
            disabled={loading || !email}
            className="w-full px-4 py-2.5 bg-[#7c3aed] hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-colors"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
            Your account will be created automatically on first sign-in.
          </p>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950/20">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/galent-logo.svg" alt="Galent" className="w-16 h-16 mx-auto mb-3 rounded-2xl" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            SalesPilot
          </h1>
        </div>

        <Suspense fallback={
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-lg shadow-purple-500/5 flex items-center justify-center h-48">
            <div className="text-sm text-slate-400">Loading...</div>
          </div>
        }>
          <LoginForm />
        </Suspense>

        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6">
          &copy; 2026 Galent. All rights reserved.
        </p>
      </div>
    </div>
  );
}
