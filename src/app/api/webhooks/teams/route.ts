/**
 * Teams Bot Framework Webhook — Full Native Integration
 *
 * 1. @mention in channels → AI processes, replies with Adaptive Card
 * 2. Meeting recap → auto-posts summary after meetings
 * 3. Proactive alerts → deal changes, risks, overdue tasks
 * 4. Compose extension → search deals from compose box
 * 5. Accept/dismiss signals → bidirectional with SalesPilot
 * 6. Card actions → create tasks, accept signals from Teams
 */
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import mongoose from 'mongoose';
import { getAnthropicClient } from '@/lib/ai/anthropic';
import { buildDealSignalCard, buildMeetingRecapCard } from '@/lib/teams/graph-client';

const BOT_APP_ID = process.env.TEAMS_BOT_APP_ID || process.env.AZURE_AD_CLIENT_ID || 'a0746e51-15c5-4a2e-867a-dae137e724f7';
const BOT_APP_SECRET = process.env.TEAMS_BOT_SECRET || process.env.AZURE_AD_CLIENT_SECRET || '';

async function getBotToken(): Promise<string | null> {
  try {
    const res = await fetch('https://login.microsoftonline.com/botframework.com/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials', client_id: BOT_APP_ID,
        client_secret: BOT_APP_SECRET, scope: 'https://api.botframework.com/.default',
      }),
    });
    return (await res.json()).access_token || null;
  } catch { return null; }
}

async function reply(serviceUrl: string, convId: string, actId: string, text: string, card?: any) {
  const token = await getBotToken();
  if (!token) return;
  const body: any = { type: 'message', from: { id: BOT_APP_ID, name: 'SalesPilot' }, conversation: { id: convId }, replyToId: actId, text };
  if (card) body.attachments = [{ contentType: 'application/vnd.microsoft.card.adaptive', content: card }];
  await fetch(`${serviceUrl}v3/conversations/${convId}/activities/${actId}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  }).catch(() => {});
}

async function processSignal(text: string, senderName: string, source: string) {
  await connectDB();
  const Opp = mongoose.models.Opportunity;
  const Task = mongoose.models.Task;
  const Notification = mongoose.models.Notification;
  const Activity = mongoose.models.Activity;

  const opps = Opp ? await Opp.find().lean() : [];
  const dealList = (opps as any[]).slice(0, 30).map((o: any) => `${o.id}: ${o.customerName} — ${o.opportunityName} (${o.status})`).join('\n');

  let ai: any = null;
  try {
    const client = getAnthropicClient();
    const r = await client.messages.create({
      model: process.env.AI_DEFAULT_MODEL || 'claude-sonnet-4-6-20250610',
      max_tokens: 1024,
      messages: [{ role: 'user', content: `Analyze this ${source} message for sales signals.\n\nFrom: ${senderName}\nMessage: ${text}\n\nDeals:\n${dealList || 'None'}\n\nReturn JSON only:\n{"matchedDealId":"id or null","matchedDealName":"name or null","customerName":"company","intent":"deal_update|meeting_notes|follow_up|question|general","sentiment":"positive|neutral|negative","actionItems":["item1"],"summary":"1-2 sentences","urgency":"high|medium|low"}` }],
    });
    const t = (r.content[0] as any).text || '';
    const m = t.match(/\{[\s\S]*\}/);
    if (m) ai = JSON.parse(m[0]);
  } catch {}

  if (Activity) {
    await Activity.create({
      type: 'teams_message', entityType: ai?.matchedDealId ? 'opportunity' : 'integration',
      entityId: ai?.matchedDealId || 'teams', entityName: ai?.matchedDealName || senderName,
      description: ai?.summary || `Teams ${source}: ${text.slice(0, 150)}`,
      userName: senderName, metadata: { source, aiResult: ai },
    });
  }

  if (Notification) {
    await Notification.create({
      userId: 'default-user', type: 'teams_signal',
      title: `${source}: ${senderName}`, message: ai?.summary || text.slice(0, 200), read: false,
      metadata: { source, senderName, matchedDealId: ai?.matchedDealId, matchedDealName: ai?.matchedDealName,
        intent: ai?.intent, urgency: ai?.urgency, sentiment: ai?.sentiment,
        actionItems: ai?.actionItems, originalText: text.slice(0, 500), status: 'pending_acceptance' },
    });
  }

  if (ai?.matchedDealId && ai?.actionItems?.length > 0 && Task) {
    for (const item of ai.actionItems.slice(0, 3)) {
      await Task.create({ opportunityId: ai.matchedDealId, name: item.slice(0, 100),
        owner: senderName || 'Unassigned', dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        priority: ai.urgency === 'high' ? 'High' : 'Medium', status: 'pending' });
    }
  }

  if (ai?.matchedDealId && Opp) {
    const logEntry = `[Teams ${source}] ${senderName}: ${text.slice(0, 300)}\nAI: ${ai?.summary || ''}`;
    await Opp.findOneAndUpdate({ id: ai.matchedDealId }, { $set: { conversationLog: logEntry } });
  }

  return { matched: !!ai?.matchedDealId, dealName: ai?.matchedDealName, intent: ai?.intent,
    summary: ai?.summary || 'Signal captured', actionItems: ai?.actionItems || [],
    urgency: ai?.urgency || 'medium', sentiment: ai?.sentiment || 'neutral', tasksCreated: ai?.actionItems?.length || 0 };
}

async function handleComposeQuery(query: string) {
  await connectDB();
  const Opp = mongoose.models.Opportunity;
  if (!Opp) return [];
  const deals = await Opp.find({
    $or: [{ customerName: { $regex: query, $options: 'i' } }, { opportunityName: { $regex: query, $options: 'i' } }],
  }).limit(10).lean();
  return (deals as any[]).map((d: any) => ({
    contentType: 'application/vnd.microsoft.card.adaptive',
    content: {
      '$schema': 'http://adaptivecards.io/schemas/adaptive-card.json', type: 'AdaptiveCard', version: '1.4',
      body: [
        { type: 'TextBlock', text: d.customerName, weight: 'Bolder', size: 'Medium' },
        { type: 'TextBlock', text: `${d.opportunityName} · ${d.status} · $${((d.tcv || 0) / 1000).toFixed(0)}k`, size: 'Small', isSubtle: true },
      ],
      actions: [{ type: 'Action.OpenUrl', title: 'Open Deal', url: `https://salespilot.galent.ai/pipeline` }],
    },
    preview: { contentType: 'application/vnd.microsoft.card.thumbnail', content: { title: d.customerName, text: `${d.opportunityName} · ${d.status} · $${((d.tcv || 0) / 1000).toFixed(0)}k` } },
  }));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, text, from, serviceUrl, conversation, id: activityId, value, name: actionName } = body;

    switch (type) {
      case 'message': {
        const sender = from?.name || 'Unknown';
        const msg = (text || '').replace(/<[^>]*>/g, '').trim();
        if (!msg || msg.length < 3) {
          await reply(serviceUrl, conversation?.id, activityId,
            "I'm SalesPilot AI. @mention me with meeting notes, deal updates, or client conversations. I'll extract signals, match deals, and create tasks.");
          return NextResponse.json({ type: 'message' });
        }
        const result = await processSignal(msg, sender, conversation?.conversationType === 'channel' ? 'teams-channel' : 'teams-chat');
        const card = buildDealSignalCard({
          title: result.matched ? `Signal: ${result.dealName}` : 'New Signal Captured',
          summary: result.summary, dealName: result.dealName,
          source: conversation?.conversationType === 'channel' ? 'Teams Channel' : 'Teams Chat',
          urgency: result.urgency as any, actionItems: result.actionItems,
          platformUrl: 'https://salespilot.galent.ai',
        });
        await reply(serviceUrl, conversation?.id, activityId, result.summary, card);
        return NextResponse.json({ type: 'message' });
      }

      case 'conversationUpdate': {
        const botAdded = (body.membersAdded || []).some((m: any) => m.id?.includes(BOT_APP_ID));
        if (botAdded && serviceUrl && conversation?.id) {
          const card = {
            '$schema': 'http://adaptivecards.io/schemas/adaptive-card.json', type: 'AdaptiveCard', version: '1.4',
            body: [
              { type: 'TextBlock', text: 'SalesPilot AI', weight: 'Bolder', size: 'Large' },
              { type: 'TextBlock', text: 'Your AI sales assistant is active.', wrap: true, size: 'Small' },
              { type: 'FactSet', facts: [
                { title: '@mention me', value: 'Send meeting notes or deal updates — AI extracts signals' },
                { title: 'Meeting recap', value: 'Auto-summaries after meetings with action items' },
                { title: 'Alerts', value: 'Deal stage changes, overdue tasks, risk detection' },
                { title: 'Search', value: 'Use compose extension to find and share deal cards' },
              ]},
            ],
          };
          await reply(serviceUrl, conversation.id, activityId || '', 'SalesPilot AI is ready.', card);
        }
        return NextResponse.json({ type: 'conversationUpdate' });
      }

      case 'invoke': {
        if (actionName === 'composeExtension/query') {
          const query = body.value?.queryOptions?.searchText || body.value?.parameters?.[0]?.value || '';
          const results = await handleComposeQuery(query);
          return NextResponse.json({ composeExtension: { type: 'result', attachmentLayout: 'list', attachments: results } });
        }

        const data = value || body.data;
        if (data?.action === 'accept_signal') {
          await connectDB();
          const N = mongoose.models.Notification;
          if (N) await N.updateMany({ 'metadata.matchedDealName': data.deal, 'metadata.status': 'pending_acceptance' }, { $set: { 'metadata.status': 'accepted', read: true } });
          return NextResponse.json({ statusCode: 200, type: 'message', value: { text: `Signal accepted for ${data.deal || 'deal'}.` } });
        }
        if (data?.action === 'dismiss_signal') {
          return NextResponse.json({ statusCode: 200, type: 'message', value: { text: 'Signal dismissed.' } });
        }
        if (data?.action === 'accept_recap') {
          await connectDB();
          const T = mongoose.models.Task;
          if (T && data.actionItems?.length) {
            for (const item of data.actionItems) {
              await T.create({ opportunityId: data.deal || '', name: item.slice(0, 100), owner: from?.name || 'Unassigned',
                dueDate: new Date(Date.now() + 3 * 86400000), priority: 'Medium', status: 'pending' });
            }
          }
          return NextResponse.json({ statusCode: 200, type: 'message', value: { text: `${data.actionItems?.length || 0} tasks created.` } });
        }
        return NextResponse.json({ statusCode: 200 });
      }

      default:
        return NextResponse.json({ type: 'message' });
    }
  } catch (e: any) {
    console.error('Teams webhook error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Teams Bot active', service: 'galent-salespilot', bot: BOT_APP_ID,
    features: ['message-extension', 'meeting-recap', 'proactive-alerts', 'compose-extension', 'accept-dismiss-signals'] });
}
