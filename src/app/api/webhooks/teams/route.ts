/**
 * Teams Webhook — receives messages from Teams bot/connector
 * Processes meeting transcripts, chat messages, and channel posts
 */
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import mongoose from 'mongoose';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    await connectDB();

    // Log the incoming Teams message as an activity
    const Activity = mongoose.models.Activity;
    if (Activity) {
      await Activity.create({
        type: 'teams_message',
        entityType: 'integration',
        entityId: 'teams',
        entityName: body.from?.name || 'Teams',
        description: `Teams: ${(body.text || body.summary || '').slice(0, 200)}`,
        userName: body.from?.name || 'Teams Bot',
        metadata: {
          channel: body.channelId,
          conversationType: body.conversation?.conversationType,
          messageId: body.id,
        },
      });
    }

    // Process as signal intake if it looks like deal-related content
    const text = body.text || body.summary || '';
    if (text.length > 20) {
      const Notification = mongoose.models.Notification;
      if (Notification) {
        await Notification.create({
          userId: 'default-user',
          type: 'teams_signal',
          title: `Teams: ${body.from?.name || 'Unknown'}`,
          message: text.slice(0, 300),
          read: false,
        });
      }
    }

    return NextResponse.json({ type: 'message', text: 'Received by SalesPilot' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Teams webhook active', service: 'galent-salespilot' });
}
