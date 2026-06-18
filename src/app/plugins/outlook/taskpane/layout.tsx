import Script from 'next/script';

export const metadata = {
  title: 'SalesPilot — Outlook',
};

export default function TaskpaneLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script src="https://appsforoffice.microsoft.com/lib/1.1/hosted/office.js" strategy="beforeInteractive" />
      <div style={{ background: '#ffffff', color: '#1a1a2e', minHeight: '100vh' }}>
        {children}
      </div>
    </>
  );
}
