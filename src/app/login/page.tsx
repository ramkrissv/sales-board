'use client';

import { signIn } from 'next-auth/react';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Sparkles } from 'lucide-react';

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('admin@galent.com');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [team, setTeam] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDevLogin = async () => {
    setLoading(true);
    await signIn('credentials', { email, callbackUrl });
  };

  const handleSignUp = async () => {
    if (!email) return;
    setLoading(true);
    await signIn('credentials', { email, name: `${firstName} ${lastName}`.trim() || email.split('@')[0], callbackUrl });
  };

  const handleAzureLogin = () => {
    signIn('azure-ad', { callbackUrl });
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-lg shadow-purple-500/5 space-y-4">
      {/* Azure AD Login - Always visible */}
      <button
        onClick={handleAzureLogin}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#0078d4] hover:bg-[#106ebe] text-white rounded-lg font-medium transition-colors"
      >
        <svg className="h-5 w-5" viewBox="0 0 21 21" fill="currentColor">
          <path d="M0 0h10v10H0zm11 0h10v10H11zM0 11h10v10H0zm11 0h10v10H11z" />
        </svg>
        Sign in with Microsoft
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
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            placeholder="admin@galent.com"
          />
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
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-green-500 mb-4">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Galent <span className="text-purple-600">SalesPilot</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">AI-Native Sales Board</p>
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
