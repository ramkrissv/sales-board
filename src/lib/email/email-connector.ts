/**
 * Email Connector — IMAP/SMTP based (works with Gmail, Outlook, any IMAP provider)
 *
 * Alternative to Microsoft Graph — doesn't require Azure AD registration.
 * Uses App Passwords for Gmail or regular credentials for other providers.
 *
 * Capabilities:
 * - Monitor inbox for deal-related emails
 * - Send follow-up emails from deal context
 * - Track email threads per deal
 * - Auto-log email activity to deal conversation log
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

interface EmailConfig {
  provider: 'gmail' | 'outlook' | 'imap';
  email: string;
  password: string; // App password for Gmail, regular for others
  imapHost?: string;
  imapPort?: number;
  smtpHost?: string;
  smtpPort?: number;
}

interface EmailMessage {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  inReplyTo?: string;
  references?: string;
}

interface EmailThread {
  messageId: string;
  from: string;
  to: string;
  subject: string;
  date: Date;
  snippet: string;
}

// Provider-specific IMAP/SMTP configs
const PROVIDER_CONFIGS: Record<string, { imap: { host: string; port: number }; smtp: { host: string; port: number } }> = {
  gmail: {
    imap: { host: 'imap.gmail.com', port: 993 },
    smtp: { host: 'smtp.gmail.com', port: 587 },
  },
  outlook: {
    imap: { host: 'outlook.office365.com', port: 993 },
    smtp: { host: 'smtp.office365.com', port: 587 },
  },
};

export class EmailConnector {
  private config: EmailConfig;
  private transporter: Transporter | null = null;

  constructor(config: EmailConfig) {
    this.config = config;
  }

  /**
   * Initialize the SMTP transporter for sending emails
   */
  private getTransporter(): Transporter {
    if (this.transporter) return this.transporter;

    const providerConfig = PROVIDER_CONFIGS[this.config.provider];
    const smtpConfig = providerConfig?.smtp || {
      host: this.config.smtpHost || 'smtp.gmail.com',
      port: this.config.smtpPort || 587,
    };

    this.transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: false,
      auth: {
        user: this.config.email,
        pass: this.config.password,
      },
    });

    return this.transporter;
  }

  /**
   * Send an email (for outreach, follow-ups, etc.)
   */
  async sendEmail(message: EmailMessage): Promise<{ messageId: string; success: boolean }> {
    const transporter = this.getTransporter();

    try {
      const info = await transporter.sendMail({
        from: `"Galent SalesPilot" <${this.config.email}>`,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
        inReplyTo: message.inReplyTo,
        references: message.references,
      });

      return { messageId: info.messageId, success: true };
    } catch (error: any) {
      console.error('Email send error:', error);
      return { messageId: '', success: false };
    }
  }

  /**
   * Send a deal follow-up email with context
   */
  async sendDealFollowUp(params: {
    to: string;
    dealName: string;
    customerName: string;
    ownerName: string;
    body: string;
  }): Promise<{ messageId: string; success: boolean }> {
    return this.sendEmail({
      from: this.config.email,
      to: params.to,
      subject: `Re: ${params.dealName} — ${params.customerName}`,
      text: params.body,
      html: `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px;">
          <p>${params.body.replace(/\n/g, '<br>')}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #888; font-size: 12px;">
            ${params.ownerName} · Galent
          </p>
        </div>
      `,
    });
  }

  /**
   * Verify SMTP connection works
   */
  async verifyConnection(): Promise<{ connected: boolean; error?: string }> {
    try {
      const transporter = this.getTransporter();
      await transporter.verify();
      return { connected: true };
    } catch (error: any) {
      return { connected: false, error: error.message };
    }
  }

  /**
   * Search inbox via IMAP for deal-related emails
   * Uses ImapFlow for modern IMAP access
   */
  async searchInbox(params: {
    from?: string;
    subject?: string;
    since?: Date;
    limit?: number;
  }): Promise<EmailThread[]> {
    try {
      const { ImapFlow } = await import('imapflow');
      const providerConfig = PROVIDER_CONFIGS[this.config.provider];
      const imapConfig = providerConfig?.imap || {
        host: this.config.imapHost || 'imap.gmail.com',
        port: this.config.imapPort || 993,
      };

      const client = new ImapFlow({
        host: imapConfig.host,
        port: imapConfig.port,
        secure: true,
        auth: { user: this.config.email, pass: this.config.password },
        logger: false,
      });

      await client.connect();
      const lock = await client.getMailboxLock('INBOX');

      try {
        const searchCriteria: any = {};
        if (params.from) searchCriteria.from = params.from;
        if (params.subject) searchCriteria.subject = params.subject;
        if (params.since) searchCriteria.since = params.since;

        const messages: EmailThread[] = [];
        const limit = params.limit || 20;

        for await (const message of client.fetch(
          { seq: `${Math.max(1, (client as any).mailbox?.exists - limit + 1)}:*` },
          { envelope: true, bodyStructure: true }
        )) {
          if (messages.length >= limit) break;
          const env = message.envelope;
          if (!env) continue;
          messages.push({
            messageId: env.messageId || '',
            from: (env.from as any)?.[0]?.address || '',
            to: (env.to as any)?.[0]?.address || '',
            subject: env.subject || '',
            date: env.date || new Date(),
            snippet: '',
          });
        }

        return messages.reverse();
      } finally {
        lock.release();
        await client.logout();
      }
    } catch (error: any) {
      console.error('IMAP search error:', error);
      return [];
    }
  }
}
