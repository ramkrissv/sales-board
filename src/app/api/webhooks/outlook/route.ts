/**
 * Outlook Webhook — receives email data from the Outlook add-in
 * AI processes the email: extracts signals, matches to deals, creates tasks, logs activity
 */
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import mongoose from 'mongoose';
import { getAnthropicClient } from '@/lib/ai/anthropic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { subject, from, to, body: emailBody, date } = body;
    const content = `Subject: ${subject || ''}\nFrom: ${from || ''}\nTo: ${to || ''}\n\n${emailBody || ''}`;

    await connectDB();
    const Opp = mongoose.models.Opportunity;
    const Activity = mongoose.models.Activity;
    const Notification = mongoose.models.Notification;
    const Task = mongoose.models.Task;

    // Get all opportunities for AI matching
    const opportunities = Opp ? await Opp.find().lean() : [];
    const dealList = (opportunities as any[]).map((o: any) => `${o.id}: ${o.customerName} — ${o.opportunityName} (${o.status})`).join('\n');

    // AI processing — extract signals and match to deals
    let aiResult: any = null;
    try {
      const client = getAnthropicClient();
      const aiResponse = await client.messages.create({
        model: process.env.AI_DEFAULT_MODEL || 'claude-sonnet-4-6-20250610',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `Analyze this email for sales intelligence. Extract key signals and match to a deal if possible.

EMAIL:
${content}

EXISTING DEALS:
${dealList || 'No deals in pipeline'}

Return JSON only (no markdown):
{
  "matchedDealId": "deal ID if matches an existing deal, or null",
  "matchedDealName": "deal name if matched",
  "customerName": "extracted company/customer name",
  "contactName": "sender name",
  "contactTitle": "sender title if detectable",
  "intent": "new_lead | deal_update | follow_up | meeting_request | general",
  "sentiment": "positive | neutral | negative",
  "actionItems": ["extracted action item 1", "action item 2"],
  "summary": "1-2 sentence summary of the email's significance for sales",
  "urgency": "high | medium | low"
}`,
        }],
      });
      const text = (aiResponse.content[0] as any).text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) aiResult = JSON.parse(jsonMatch[0]);
    } catch (e) {
      // AI processing failed — continue with basic logging
    }

    // Log activity
    if (Activity) {
      await Activity.create({
        type: 'outlook_email',
        entityType: aiResult?.matchedDealId ? 'opportunity' : 'integration',
        entityId: aiResult?.matchedDealId || 'outlook',
        entityName: aiResult?.matchedDealName || from || 'Outlook',
        description: aiResult?.summary || `Email: ${(subject || '').slice(0, 100)}`,
        userName: from || 'Outlook Add-in',
        metadata: { subject, from, to, date, aiResult },
      });
    }

    // If matched to a deal, append to conversation log
    if (aiResult?.matchedDealId && Opp) {
      const logEntry = `[Outlook Email] From: ${from} | Subject: ${subject}\n${aiResult.summary || ''}`;
      await Opp.findOneAndUpdate(
        { id: aiResult.matchedDealId },
        { $set: { conversationLog: logEntry } }, // Appends to existing
      );
    }

    // Create tasks from action items
    if (aiResult?.actionItems?.length > 0 && aiResult.matchedDealId && Task) {
      for (const action of aiResult.actionItems.slice(0, 3)) {
        await Task.create({
          opportunityId: aiResult.matchedDealId,
          name: action.slice(0, 100),
          owner: 'Unassigned',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
          priority: aiResult.urgency === 'high' ? 'High' : 'Medium',
          status: 'pending',
        });
      }
    }

    // Create notification
    if (Notification) {
      const icon = aiResult?.sentiment === 'positive' ? '🟢' :
                   aiResult?.sentiment === 'negative' ? '🔴' : '🔵';
      await Notification.create({
        userId: 'default-user',
        type: 'ai_signal',
        title: `${icon} ${aiResult?.intent === 'new_lead' ? 'New Lead' : 'Email Signal'}: ${subject || 'No subject'}`,
        message: aiResult?.summary || `From ${from}: ${(emailBody || '').slice(0, 150)}`,
        read: false,
        metadata: {
          source: 'outlook',
          matchedDealId: aiResult?.matchedDealId,
          matchedDealName: aiResult?.matchedDealName,
          intent: aiResult?.intent,
          urgency: aiResult?.urgency,
          sentiment: aiResult?.sentiment,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Email processed by SalesPilot AI',
      result: {
        matched: !!aiResult?.matchedDealId,
        dealName: aiResult?.matchedDealName,
        intent: aiResult?.intent,
        summary: aiResult?.summary,
        actionItems: aiResult?.actionItems || [],
        tasksCreated: aiResult?.actionItems?.length || 0,
        urgency: aiResult?.urgency,
        sentiment: aiResult?.sentiment,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Outlook webhook active', service: 'galent-salespilot' });
}
