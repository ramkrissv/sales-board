'use client';

import { useEffect } from 'react';

// Redirect to static HTML taskpane (no Next.js runtime needed)
export default function TaskpaneRedirect() {
  useEffect(() => {
    window.location.replace('/plugins/outlook/taskpane.html');
  }, []);

  return (
    <div style={{ background: '#fff', padding: 32, textAlign: 'center', minHeight: '100vh', fontFamily: 'Segoe UI, system-ui, sans-serif' }}>
      <p style={{ color: '#999', fontSize: 13 }}>Loading SalesPilot...</p>
    </div>
  );
}
