/**
 * Daily Sales Digest — sends per-user pipeline summary emails
 *
 * POST /api/digest  — Send digest to all users (protected by DIGEST_API_KEY)
 *   Query params: ?userId=xxx (optional — send to one user only)
 * GET  /api/digest?userId=xxx — Preview digest HTML (admin debug)
 */
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import mongoose from 'mongoose';
import { sendMail, isSmtpConfigured } from '@/lib/email/mailer';

const DIGEST_API_KEY = process.env.DIGEST_API_KEY || '';
const PLATFORM_URL = process.env.NEXTAUTH_URL || 'https://salespilot.galent.ai';

function buildDigestHtml(user: any, deals: any[], tasks: any[], signals: any[]): string {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const firstName = user.firstName || user.email?.split('@')[0] || 'there';

  // KPIs
  const activeDeals = deals.filter((d: any) => !['Won', 'Lost'].includes(d.status));
  const totalPipeline = activeDeals.reduce((s: number, d: any) => s + (d.tcv || 0), 0);
  const overdueTasks = tasks.filter((t: any) => t.status === 'pending' && new Date(t.dueDate) < new Date());
  const closingThisMonth = activeDeals.filter((d: any) => {
    const days = Math.ceil((new Date(d.expectedCloseDate).getTime() - Date.now()) / 86400000);
    return days >= 0 && days <= 30;
  });

  // Deals needing action
  const needsAction: { deal: string; customer: string; issue: string; id: string }[] = [];
  for (const d of activeDeals.slice(0, 30)) {
    const stakeholders = d.customerStakeholders || [];
    if (!stakeholders.some((s: any) => s.isDecisionMaker)) {
      needsAction.push({ deal: d.opportunityName, customer: d.customerName, issue: 'No decision maker mapped', id: d.id });
    }
    if (!d.tcv || d.tcv === 0) {
      needsAction.push({ deal: d.opportunityName, customer: d.customerName, issue: '$0 TCV — set deal value', id: d.id });
    }
    const age = (Date.now() - new Date(d.updatedAt || d.createdAt || d.expectedCloseDate).getTime()) / 86400000;
    if (age > 14) {
      needsAction.push({ deal: d.opportunityName, customer: d.customerName, issue: `Stale ${Math.round(age)} days — needs follow-up`, id: d.id });
    }
  }

  const kpiStyle = 'text-align:center;padding:16px;border-radius:8px;background:#f8f7ff;';
  const kpiValue = 'font-size:24px;font-weight:700;color:#7c3aed;margin:0;';
  const kpiLabel = 'font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin:4px 0 0;';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>SalesPilot Digest</title></head>
<body style="margin:0;padding:0;background:#f4f3f8;font-family:'Inter','Segoe UI',system-ui,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3f8;padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

<!-- Header -->
<tr><td style="background:linear-gradient(135deg,#7c3aed,#5b21b6);padding:28px 32px;">
  <table width="100%"><tr>
    <td><span style="font-size:20px;font-weight:700;color:#fff;">SalesPilot</span></td>
    <td align="right"><span style="font-size:12px;color:rgba(255,255,255,0.8);">${today}</span></td>
  </tr></table>
  <p style="color:rgba(255,255,255,0.9);font-size:14px;margin:8px 0 0;">Hi ${firstName}, here's your daily pipeline digest.</p>
</td></tr>

<!-- KPI Strip -->
<tr><td style="padding:24px 32px 16px;">
  <table width="100%" cellpadding="0" cellspacing="8"><tr>
    <td width="25%" style="${kpiStyle}"><p style="${kpiValue}">$${(totalPipeline / 1000).toFixed(0)}k</p><p style="${kpiLabel}">Pipeline</p></td>
    <td width="25%" style="${kpiStyle}"><p style="${kpiValue}">${activeDeals.length}</p><p style="${kpiLabel}">Active Deals</p></td>
    <td width="25%" style="${kpiStyle}"><p style="${kpiValue} ${overdueTasks.length > 0 ? 'color:#ef4444;' : ''}">${overdueTasks.length}</p><p style="${kpiLabel}">Overdue Tasks</p></td>
    <td width="25%" style="${kpiStyle}"><p style="${kpiValue} color:#f59e0b;">${closingThisMonth.length}</p><p style="${kpiLabel}">Closing Soon</p></td>
  </tr></table>
</td></tr>

<!-- Deals Needing Action -->
${needsAction.length > 0 ? `
<tr><td style="padding:8px 32px 16px;">
  <p style="font-size:13px;font-weight:700;color:#1a1a2e;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.5px;">
    <span style="color:#ef4444;">&#9679;</span> Deals Needing Action (${needsAction.length})
  </p>
  <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
    <tr style="background:#fafafa;">
      <td style="padding:8px 12px;font-size:11px;font-weight:600;color:#666;">Deal</td>
      <td style="padding:8px 12px;font-size:11px;font-weight:600;color:#666;">Customer</td>
      <td style="padding:8px 12px;font-size:11px;font-weight:600;color:#666;">Issue</td>
    </tr>
    ${needsAction.slice(0, 5).map((a, i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#fafafa'};">
      <td style="padding:8px 12px;font-size:12px;color:#333;">${a.deal}</td>
      <td style="padding:8px 12px;font-size:12px;color:#666;">${a.customer}</td>
      <td style="padding:8px 12px;font-size:12px;color:#ef4444;">${a.issue}</td>
    </tr>`).join('')}
  </table>
  ${needsAction.length > 5 ? `<p style="font-size:11px;color:#888;margin:8px 0 0;">+${needsAction.length - 5} more — <a href="${PLATFORM_URL}/pipeline" style="color:#7c3aed;">view in SalesPilot</a></p>` : ''}
</td></tr>` : ''}

<!-- Overdue Tasks -->
${overdueTasks.length > 0 ? `
<tr><td style="padding:8px 32px 16px;">
  <p style="font-size:13px;font-weight:700;color:#1a1a2e;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.5px;">
    <span style="color:#f59e0b;">&#9679;</span> Overdue Tasks (${overdueTasks.length})
  </p>
  <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
    ${overdueTasks.slice(0, 5).map((t: any, i: number) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#fafafa'};">
      <td style="padding:8px 12px;font-size:12px;color:#333;">${t.name}</td>
      <td style="padding:8px 12px;font-size:12px;color:#666;">${t.customerName || ''}</td>
      <td style="padding:8px 12px;font-size:12px;color:#f59e0b;">Due ${new Date(t.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
    </tr>`).join('')}
  </table>
</td></tr>` : ''}

<!-- Signals -->
${signals.length > 0 ? `
<tr><td style="padding:8px 32px 16px;">
  <p style="font-size:13px;font-weight:700;color:#1a1a2e;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.5px;">
    <span style="color:#7c3aed;">&#9679;</span> Recent Signals (${signals.length})
  </p>
  ${signals.slice(0, 3).map((s: any) => `
  <div style="padding:10px 12px;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:6px;">
    <p style="font-size:12px;font-weight:600;color:#333;margin:0;">${s.title}</p>
    <p style="font-size:11px;color:#666;margin:4px 0 0;">${s.message?.slice(0, 120) || ''}</p>
  </div>`).join('')}
</td></tr>` : ''}

<!-- Quick Links -->
<tr><td style="padding:16px 32px 24px;">
  <table width="100%" cellpadding="0" cellspacing="8"><tr>
    <td width="33%" align="center"><a href="${PLATFORM_URL}/pipeline" style="display:block;padding:10px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;font-size:12px;font-weight:600;">Open Pipeline</a></td>
    <td width="33%" align="center"><a href="${PLATFORM_URL}/tasks" style="display:block;padding:10px;background:#f4f3f8;color:#7c3aed;text-decoration:none;border-radius:8px;font-size:12px;font-weight:600;">My Tasks</a></td>
    <td width="33%" align="center"><a href="${PLATFORM_URL}/ask" style="display:block;padding:10px;background:#f4f3f8;color:#7c3aed;text-decoration:none;border-radius:8px;font-size:12px;font-weight:600;">Ask Galent</a></td>
  </tr></table>
</td></tr>

<!-- Footer -->
<tr><td style="padding:16px 32px;background:#fafafa;border-top:1px solid #e5e7eb;">
  <p style="font-size:10px;color:#999;margin:0;text-align:center;">
    Galent SalesPilot &middot; AI-Native Sales Intelligence &middot; <a href="${PLATFORM_URL}" style="color:#7c3aed;">salespilot.galent.ai</a>
  </p>
</td></tr>

</table>
</td></tr></table>
</body></html>`;
}

async function getDigestDataForUser(user: any) {
  const Opp = mongoose.models.Opportunity;
  const Notification = mongoose.models.Notification;

  const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  const escapedName = userName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Get user's deals (by owner match)
  let deals: any[] = [];
  if (Opp) {
    if (userName) {
      deals = await Opp.find({
        $or: [
          { primaryOwner: userName },
          { primaryOwner: { $regex: new RegExp(escapedName, 'i') } },
          { salesPOCs: userName },
          { presalesPOCs: userName },
        ],
      }).lean();
    }
    // If no deals matched by name, get all (admin/fallback)
    if (deals.length === 0) {
      deals = await Opp.find().lean();
    }
  }

  // Get overdue tasks from deals
  const tasks = deals.flatMap((d: any) =>
    (d.subTasks || []).map((t: any) => ({ ...t, customerName: d.customerName, opportunityName: d.opportunityName }))
  );

  // Get recent unread signals (last 24h)
  let signals: any[] = [];
  if (Notification) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    signals = await Notification.find({
      $or: [{ userId: user._id?.toString() }, { userId: 'default-user' }],
      read: false,
      type: { $in: ['ai_signal', 'teams_signal', 'outlook_signal'] },
      createdAt: { $gte: oneDayAgo },
    }).sort({ createdAt: -1 }).limit(5).lean();
  }

  return { deals, tasks, signals };
}

export async function POST(req: NextRequest) {
  // Auth check
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!DIGEST_API_KEY || token !== DIGEST_API_KEY) {
    // Also allow session-based auth for Settings "Send Test"
    const sessionUserId = req.headers.get('x-user-id');
    if (!sessionUserId) {
      return NextResponse.json({ error: 'Unauthorized. Provide Authorization: Bearer <DIGEST_API_KEY>' }, { status: 401 });
    }
  }

  if (!isSmtpConfigured()) {
    return NextResponse.json({ error: 'SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS.' }, { status: 500 });
  }

  await connectDB();
  const User = mongoose.models.User;
  if (!User) {
    return NextResponse.json({ error: 'User model not available' }, { status: 500 });
  }

  // Check if targeting a specific user
  const url = new URL(req.url);
  const targetUserId = url.searchParams.get('userId');

  let users: any[];
  if (targetUserId) {
    const user = await User.findById(targetUserId).lean();
    users = user ? [user] : [];
  } else {
    users = await User.find({ email: { $exists: true, $ne: '' } }).lean();
  }

  let sent = 0, failed = 0, skipped = 0;
  const results: any[] = [];

  for (const user of users) {
    if (!user.email) { skipped++; continue; }

    try {
      const { deals, tasks, signals } = await getDigestDataForUser(user);
      const html = buildDigestHtml(user, deals, tasks, signals);
      const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const result = await sendMail(
        user.email,
        `SalesPilot Daily Digest — ${today}`,
        html
      );

      if (result.success) {
        sent++;
        results.push({ email: user.email, status: 'sent', messageId: result.messageId });
      } else {
        failed++;
        results.push({ email: user.email, status: 'failed', error: result.error });
      }
    } catch (err: any) {
      failed++;
      results.push({ email: user.email, status: 'error', error: err.message });
    }
  }

  return NextResponse.json({ sent, failed, skipped, total: users.length, results });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const userId = url.searchParams.get('userId');

  await connectDB();
  const User = mongoose.models.User;

  let user: any;
  if (userId && User) {
    user = await User.findById(userId).lean();
  }
  if (!user) {
    user = { email: 'preview@example.com', firstName: 'Preview', lastName: 'User' };
  }

  const { deals, tasks, signals } = await getDigestDataForUser(user);
  const html = buildDigestHtml(user, deals, tasks, signals);

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } });
}
