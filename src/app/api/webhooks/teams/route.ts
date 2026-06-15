/**
 * Teams Bot Framework Webhook
 *
 * Handles:
 * - Direct messages to the bot → AI processes as deal signal
 * - @mentions in channels → responds with deal intelligence
 * - Meeting transcript events → auto-captures and processes
 * - Conversation updates → welcome message on install
 */
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import mongoose from 'mongoose';
import { getAnthropicClient } from '@/lib/ai/anthropic';

const BOT_APP_ID = process.env.TEAMS_BOT_APP_ID || 'a0746e51-15c5-4a2e-867a-dae137e724f7';
const BOT_APP_SECRET = process.env.TEAMS_BOT_SECRET || '';
const BOT_TENANT_ID = process.env.AZURE_AD_TENANT_ID || '';

// Send a reply back to Teams
async function sendTeamsReply(serviceUrl: string, conversationId: string, activityId: string, text: string, card?: any) {
  try {
    // Get bot access token
    const tokenRes = await fetch('https://login.microsoftonline.com/botframework.com/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: BOT_APP_ID,
        client_secret: BOT_APP_SECRET,
        scope: 'https://api.botframework.com/.default',
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) return;

    const replyBody: any = {
      type: 'message',
      from: { id: BOT_APP_ID, name: 'SalesPilot' },
      conversation: { id: conversationId },
      replyToId: activityId,
      text,
    };

    if (card) {
      replyBody.attachments = [{
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: card,
      }];
    }

    const url = `${serviceUrl}v3/conversations/${conversationId}/activities/${activityId}`;
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenData.access_token}`,
      },
      body: JSON.stringify(replyBody),
    });
  } catch (e) {
    console.error('Failed to send Teams reply:', e);
  }
}

// Build an Adaptive Card for deal signals
function buildSignalCard(result: any) {
  return {
    '$schema': 'http://adaptivecards.io/schemas/adaptive-card.json',
    type: 'AdaptiveCard',
    version: '1.4',
    body: [
      {
        type: 'ColumnSet',
        columns: [
          {
            type: 'Column', width: 'auto',
            items: [{ type: 'Image', url: 'https://salespilot.galent.ai/galent-logo.svg', size: 'Small' }],
          },
          {
            type: 'Column', width: 'stretch',
            items: [
              { type: 'TextBlock', text: 'SalesPilot AI', weight: 'Bolder', size: 'Medium' },
              { type: 'TextBlock', text: 'Signal captured and processed', size: 'Small', isSubtle: true },
            ],
          },
        ],
      },
      ...(result.matched ? [{
        type: 'Container' as const,
        style: 'accent' as const,
        items: [
          { type: 'TextBlock' as const, text: `Deal Match: ${result.dealName}`, weight: 'Bolder' as const, size: 'Small' as const },
        ],
      }] : [{
        type: 'TextBlock' as const,
        text: 'No deal match — logged as new signal',
        size: 'Small' as const,
        isSubtle: true,
        color: 'Warning' as const,
      }]),
      ...(result.summary ? [{ type: 'TextBlock' as const, text: result.summary, wrap: true, size: 'Small' as const }] : []),
      ...(result.actionItems?.length > 0 ? [{
        type: 'FactSet' as const,
        facts: result.actionItems.slice(0, 3).map((a: string, i: number) => ({
          title: `Action ${i + 1}`,
          value: a,
        })),
      }] : []),
      {
        type: 'ColumnSet' as const,
        columns: [
          ...(result.intent ? [{
            type: 'Column' as const, width: 'auto' as const,
            items: [{ type: 'TextBlock' as const, text: result.intent.replace('_', ' '), size: 'Small' as const, color: 'Accent' as const }],
          }] : []),
          ...(result.urgency ? [{
            type: 'Column' as const, width: 'auto' as const,
            items: [{ type: 'TextBlock' as const, text: `${result.urgency} urgency`, size: 'Small' as const, color: result.urgency === 'high' ? 'Attention' as const : 'Default' as const }],
          }] : []),
          ...(result.tasksCreated > 0 ? [{
            type: 'Column' as const, width: 'auto' as const,
            items: [{ type: 'TextBlock' as const, text: `${result.tasksCreated} tasks created`, size: 'Small' as const, color: 'Good' as const }],
          }] : []),
        ],
      },
    ],
    actions: [
      {
        type: 'Action.OpenUrl',
        title: 'Open SalesPilot',
        url: 'https://salespilot.galent.ai',
      },
    ],
  };
}

// AI-process a message for deal signals
async function processMessage(text: string, senderName: string) {
  await connectDB();
  const Opp = mongoose.models.Opportunity;
  const Activity = mongoose.models.Activity;
  const Notification = mongoose.models.Notification;
  const Task = mongoose.models.Task;

  const opportunities = Opp ? await Opp.find().lean() : [];
  const dealList = (opportunities as any[]).map((o: any) => `${o.id}: ${o.customerName} — ${o.opportunityName} (${o.status})`).join('\n');

  let aiResult: any = null;
  try {
    const client = getAnthropicClient();
    const aiResponse = await client.messages.create({
      model: process.env.AI_DEFAULT_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Analyze this Teams message for sales intelligence. Extract signals and match to a deal.

MESSAGE from ${senderName}:
${text}

EXISTING DEALS:
${dealList || 'No deals'}

Return JSON only:
{
  "matchedDealId": "deal ID or null",
  "matchedDealName": "deal name or null",
  "customerName": "company name if mentioned",
  "intent": "deal_update | meeting_notes | follow_up | question | general",
  "sentiment": "positive | neutral | negative",
  "actionItems": ["action 1", "action 2"],
  "summary": "1-2 sentence summary",
  "urgency": "high | medium | low"
}`,
      }],
    });
    const respText = (aiResponse.content[0] as any).text || '';
    const jsonMatch = respText.match(/\{[\s\S]*\}/);
    if (jsonMatch) aiResult = JSON.parse(jsonMatch[0]);
  } catch { /* AI failed — continue */ }

  // Log activity
  if (Activity) {
    await Activity.create({
      type: 'teams_message',
      entityType: aiResult?.matchedDealId ? 'opportunity' : 'integration',
      entityId: aiResult?.matchedDealId || 'teams',
      entityName: aiResult?.matchedDealName || senderName,
      description: aiResult?.summary || `Teams message from ${senderName}: ${text.slice(0, 150)}`,
      userName: senderName,
      metadata: { source: 'teams-bot', aiResult },
    });
  }

  // If matched, update deal conversation log
  if (aiResult?.matchedDealId && Opp) {
    const logEntry = `[Teams] ${senderName}: ${text.slice(0, 300)}\nAI: ${aiResult.summary || ''}`;
    await Opp.findOneAndUpdate(
      { id: aiResult.matchedDealId },
      { $set: { conversationLog: logEntry } },
    );
  }

  // Create tasks
  if (aiResult?.actionItems?.length > 0 && aiResult.matchedDealId && Task) {
    for (const action of aiResult.actionItems.slice(0, 2)) {
      await Task.create({
        opportunityId: aiResult.matchedDealId,
        name: action.slice(0, 100),
        owner: senderName || 'Unassigned',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        priority: aiResult.urgency === 'high' ? 'High' : 'Medium',
        status: 'pending',
      });
    }
  }

  // Notification
  if (Notification) {
    await Notification.create({
      userId: 'default-user',
      type: 'ai_signal',
      title: `Teams: ${senderName}`,
      message: aiResult?.summary || text.slice(0, 200),
      read: false,
      metadata: { source: 'teams-bot', matchedDealId: aiResult?.matchedDealId },
    });
  }

  return {
    matched: !!aiResult?.matchedDealId,
    dealName: aiResult?.matchedDealName,
    intent: aiResult?.intent,
    summary: aiResult?.summary || 'Message captured',
    actionItems: aiResult?.actionItems || [],
    tasksCreated: aiResult?.actionItems?.length || 0,
    urgency: aiResult?.urgency,
    sentiment: aiResult?.sentiment,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, text, from, serviceUrl, conversation, id: activityId } = body;

    // Bot Framework activity types
    switch (type) {
      case 'message': {
        // User sent a message to the bot
        const senderName = from?.name || 'Unknown';
        const messageText = (text || '').replace(/<[^>]*>/g, '').trim(); // Strip HTML/mentions

        if (!messageText || messageText.length < 3) {
          await sendTeamsReply(serviceUrl, conversation?.id, activityId,
            "Hi! I'm SalesPilot AI. Send me meeting notes, deal updates, or client conversations — I'll extract signals, match to deals, and create tasks automatically.");
          return NextResponse.json({ type: 'message' });
        }

        // Process the message with AI
        const result = await processMessage(messageText, senderName);

        // Reply with an Adaptive Card
        const card = buildSignalCard(result);
        await sendTeamsReply(serviceUrl, conversation?.id, activityId, result.summary, card);

        return NextResponse.json({ type: 'message' });
      }

      case 'conversationUpdate': {
        // Bot was added to a conversation
        const membersAdded = body.membersAdded || [];
        const botWasAdded = membersAdded.some((m: any) => m.id === BOT_APP_ID || m.id?.includes(BOT_APP_ID));

        if (botWasAdded && serviceUrl && conversation?.id) {
          const welcomeCard = {
            '$schema': 'http://adaptivecards.io/schemas/adaptive-card.json',
            type: 'AdaptiveCard',
            version: '1.4',
            body: [
              { type: 'TextBlock', text: 'SalesPilot AI', weight: 'Bolder', size: 'Large' },
              { type: 'TextBlock', text: "I'm your AI sales assistant. Here's what I can do:", wrap: true, size: 'Small' },
              {
                type: 'FactSet',
                facts: [
                  { title: 'Meeting Notes', value: 'Paste meeting transcripts — I extract action items and match to deals' },
                  { title: 'Deal Updates', value: 'Tell me about client conversations — I log signals and create tasks' },
                  { title: 'Quick Intel', value: 'Ask me about any deal, account, or pipeline status' },
                  { title: 'Follow-ups', value: 'I auto-create follow-up tasks from detected action items' },
                ],
              },
              { type: 'TextBlock', text: 'Just send me a message to get started.', size: 'Small', isSubtle: true },
            ],
          };

          await sendTeamsReply(serviceUrl, conversation.id, activityId || '',
            "Hi! I'm SalesPilot AI — your sales intelligence assistant.", welcomeCard);
        }

        return NextResponse.json({ type: 'conversationUpdate' });
      }

      case 'invoke': {
        // Handle invoke activities (messaging extensions, card actions)
        return NextResponse.json({ status: 200, body: {} });
      }

      default: {
        return NextResponse.json({ type: 'message' });
      }
    }
  } catch (e: any) {
    console.error('Teams webhook error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Teams Bot active', service: 'galent-salespilot', bot: BOT_APP_ID });
}
