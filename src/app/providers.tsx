'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { InsightProvider } from '@/lib/intelligence/InsightStore';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <InsightProvider>
          {children}
        </InsightProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
