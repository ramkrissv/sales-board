'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ fontFamily: 'system-ui', padding: '40px', background: '#0a0a0b', color: '#fff' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>Something went wrong</h1>
        <pre style={{
          background: '#1a1a2e', padding: '20px', borderRadius: '8px',
          overflow: 'auto', fontSize: '13px', color: '#ef4444',
          border: '1px solid #333', maxWidth: '800px'
        }}>
          {error.message}
          {'\n\n'}
          {error.stack}
          {error.digest && `\n\nDigest: ${error.digest}`}
        </pre>
        <button
          onClick={reset}
          style={{
            marginTop: '20px', padding: '10px 20px', background: '#7c3aed',
            color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
