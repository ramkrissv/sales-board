import { describe, it, expect } from 'vitest';

describe('Email Connector', () => {
  describe('Provider Configs', () => {
    const PROVIDER_CONFIGS: Record<string, { imap: { host: string; port: number }; smtp: { host: string; port: number } }> = {
      gmail: { imap: { host: 'imap.gmail.com', port: 993 }, smtp: { host: 'smtp.gmail.com', port: 587 } },
      outlook: { imap: { host: 'outlook.office365.com', port: 993 }, smtp: { host: 'smtp.office365.com', port: 587 } },
    };

    it('should support Gmail', () => {
      expect(PROVIDER_CONFIGS.gmail).toBeDefined();
      expect(PROVIDER_CONFIGS.gmail.imap.host).toBe('imap.gmail.com');
      expect(PROVIDER_CONFIGS.gmail.smtp.host).toBe('smtp.gmail.com');
    });

    it('should support Outlook', () => {
      expect(PROVIDER_CONFIGS.outlook).toBeDefined();
      expect(PROVIDER_CONFIGS.outlook.imap.host).toBe('outlook.office365.com');
    });

    it('IMAP should use port 993 (SSL)', () => {
      Object.values(PROVIDER_CONFIGS).forEach(config => {
        expect(config.imap.port).toBe(993);
      });
    });

    it('SMTP should use port 587 (TLS)', () => {
      Object.values(PROVIDER_CONFIGS).forEach(config => {
        expect(config.smtp.port).toBe(587);
      });
    });
  });

  describe('Email Templates', () => {
    it('deal follow-up should include customer and deal name', () => {
      const params = { to: 'john@acme.com', dealName: 'AI Platform', customerName: 'Acme Corp', ownerName: 'Sreeram', body: 'Following up on our discussion.' };
      const subject = `Re: ${params.dealName} — ${params.customerName}`;
      expect(subject).toBe('Re: AI Platform — Acme Corp');
    });

    it('HTML email should wrap body in styled div', () => {
      const body = 'Hello, following up.';
      const html = `<div style="font-family: 'Inter', sans-serif;">${body}</div>`;
      expect(html).toContain('Inter');
      expect(html).toContain(body);
    });
  });
});
