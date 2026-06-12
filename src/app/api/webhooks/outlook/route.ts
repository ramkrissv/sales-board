/**
 * Outlook Webhook — receives email data from the Outlook add-in
 * Processes emails and calendar events into SalesPilot signals
 */
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import mongoose from 'mongoose';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    await connectDB();

    // Log as activity
    const Activity = mongoose.models.Activity;
    if (Activity) {
      await Activity.create({
        type: 'outlook_email',
        entityType: 'integration',
        entityId: 'outlook',
        entityName: body.from || body.sender || 'Outlook',
        description: `Email: ${(body.subject || '').slice(0, 100)} — ${(body.body || body.preview || '').slice(0, 200)}`,
        userName: body.from || 'Outlook Add-in',
        metadata: {
          subject: body.subject,
          from: body.from,
          to: body.to,
          date: body.date,
        },
      });
    }

    // Create notification
    const Notification = mongoose.models.Notification;
    if (Notification) {
      await Notification.create({
        userId: 'default-user',
        type: 'outlook_signal',
        title: `Email: ${body.subject || 'No subject'}`,
        message: `From ${body.from || 'unknown'}: ${(body.preview || body.body || '').slice(0, 200)}`,
        read: false,
      });
    }

    return NextResponse.json({ success: true, message: 'Email captured by SalesPilot' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Outlook webhook active', service: 'galent-salespilot' });
}
