import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { TRPCProvider } from '@/lib/trpc/provider';
import { AppShell } from '@/components/layout/AppShell';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Galent AI — Sales Intelligence',
  description: 'AI-native revenue intelligence platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-[#0a0a1a] text-slate-200`}>
        <Providers>
          <TRPCProvider>
            <AppShell>
              {children}
            </AppShell>
          </TRPCProvider>
        </Providers>
      </body>
    </html>
  );
}
