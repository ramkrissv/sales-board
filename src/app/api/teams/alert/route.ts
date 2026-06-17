/**
 * Proactive Teams Alert API
 *
 * Called by SalesPilot platform to push alerts to Teams channels:
 * - Deal stage changes
 * - Overdue tasks
 * - AI-detected risks
 * - New signals for acceptance
 *
 * POST /api/teams/alert
 * { type, title, summary, dealName, urgency, channelWebhookUrl }
 */
import { NextRequest, NextResponse } from 'next/server';
import { buildDealSignalCard } from '@/lib/teams/graph-client';

export async function POST(req: NextRequest) {
  try {
    const { type, title, summary, dealName, urgency, actionItems, channelWebhookUrl } = await req.json();

    if (!channelWebhookUrl) {
      return NextResponse.json({ error: 'channelWebhookUrl required' }, { status: 400 });
    }

    const card = buildDealSignalCard({
      title: title || 'SalesPilot Alert',
      summary: summary || '',
      dealName,
      source: type || 'Platform',
      urgency: urgency || 'medium',
      actionItems,
      platformUrl: 'https://salespilot.galent.ai',
    });

    // Send via incoming webhook (simplest proactive method — no bot token needed)
    const res = await fetch(channelWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'message',
        attachments: [{
          contentType: 'application/vnd.microsoft.card.adaptive',
          contentUrl: null,
          content: card,
        }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }

    return NextResponse.json({ success: true, message: 'Alert sent to Teams' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
