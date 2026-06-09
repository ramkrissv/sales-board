'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { Sparkles } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@galent.com');
  const [loading, setLoading] = useState(false);

  const handleDevLogin = async () => {
    setLoading(true);
    await signIn('credentials', { email, callbackUrl: '/' });
  };

  const handleAzureLogin = () => {
    signIn('azure-ad', { callbackUrl: '/' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950/20">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-green-500 mb-4">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Galent <span className="text-purple-600">AI</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Sales Intelligence Platform</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-lg shadow-purple-500/5 space-y-4">
          {/* Azure AD Login */}
          {process.env.NEXT_PUBLIC_AZURE_AD_ENABLED === 'true' && (
            <>
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
            </>
          )}

          {/* Dev Login */}
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
              className="w-full px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6">
          &copy; 2026 Galent AI. All rights reserved.
        </p>
      </div>
    </div>
  );
}
