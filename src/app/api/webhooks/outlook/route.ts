/**
 * Outlook Webhook — receives email data from the Outlook add-in
 * AI processes the email: extracts signals, matches to deals, creates tasks, logs activity
 */
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import mongoose from 'mongoose';
import { getAnthropicClient } from '@/lib/ai/anthropic';
import { GraphService } from '@/lib/graph/graph-service';

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
        model: process.env.AI_DEFAULT_MODEL || 'claude-sonnet-4-6',
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

    // Update knowledge graph
    try {
      // Add contact node
      if (aiResult?.contactName || from) {
        const contactId = `contact:${(aiResult?.contactName || from || '').toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        await GraphService.upsertNode(contactId, 'person', aiResult?.contactName || from || '', {
          email: from, title: aiResult?.contactTitle, source: 'outlook', lastSignal: new Date(),
        }, 'outlook-webhook');

        // Link contact to deal if matched
        if (aiResult?.matchedDealId) {
          await GraphService.addEdge(contactId, `deal:${aiResult.matchedDealId}`, 'involved_in', {
            weight: 0.8, context: `Email: ${subject}`,
          });
        }

        // Link contact to company if detected
        if (aiResult?.customerName) {
          const companyId = `company:${aiResult.customerName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
          await GraphService.upsertNode(companyId, 'account', aiResult.customerName, {
            source: 'outlook', lastSignal: new Date(),
          }, 'outlook-webhook');
          await GraphService.addEdge(contactId, companyId, 'works_at', { weight: 0.9 });
        }
      }

      // Add signal node
      const signalId = `signal:outlook:${Date.now()}`;
      await GraphService.upsertNode(signalId, 'signal' as any, `Email: ${subject || 'Signal'}`, {
        source: 'outlook', from, subject, intent: aiResult?.intent, urgency: aiResult?.urgency,
        sentiment: aiResult?.sentiment, summary: aiResult?.summary, timestamp: new Date(),
      }, 'outlook-webhook');

      if (aiResult?.matchedDealId) {
        await GraphService.addEdge(signalId, `deal:${aiResult.matchedDealId}`, 'relates_to', { weight: 0.7 });
      }
    } catch { /* Graph update best-effort */ }

    // Auto-create opportunity for new leads with no deal match
    let autoCreatedDealId: string | null = null;
    let autoCreatedDealName: string | null = null;
    if (!aiResult?.matchedDealId && aiResult?.intent === 'new_lead' && aiResult?.customerName && Opp) {
      try {
        // Check if opportunity already exists for this customer (prevent duplicates)
        const existing = await Opp.findOne({
          customerName: { $regex: new RegExp(aiResult.customerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
          status: { $nin: ['Won', 'Lost'] },
        });

        if (existing) {
          // Link to existing deal instead
          aiResult.matchedDealId = (existing as any).id;
          aiResult.matchedDealName = `${(existing as any).customerName} — ${(existing as any).opportunityName}`;
          autoCreatedDealId = (existing as any).id;
          autoCreatedDealName = (existing as any).customerName;

          // Append signal to conversation log
          const logEntry = `\n\n--- SIGNAL (${new Date().toISOString().split('T')[0]}) ---\n${aiResult.summary || subject}\nSource: Outlook · From: ${from}`;
          await Opp.findOneAndUpdate(
            { id: (existing as any).id },
            { $set: { conversationLog: ((existing as any).conversationLog || '') + logEntry, updatedAt: new Date() } },
          );
        } else {
          // Create new opportunity automatically
          const newOppId = `OPP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
          const newOpp = await Opp.create({
            id: newOppId,
            customerName: aiResult.customerName,
            opportunityName: `${aiResult.customerName} — ${subject ? subject.slice(0, 60) : 'Inbound Signal'}`,
            status: 'Discovery',
            tcv: 0,
            dealDuration: '12 months',
            expectedCloseDate: new Date(Date.now() + 90 * 86400000),
            startDate: new Date(),
            primaryOwner: aiResult.contactName || from?.split('@')[0] || 'Unassigned',
            industry: '',
            region: 'North America',
            source: 'Signal',
            conversationLog: `--- ORIGINAL SIGNAL ---\nFrom: ${from}\nSubject: ${subject}\n\n${aiResult.summary || ''}\n\nAction Items:\n${(aiResult.actionItems || []).map((a: string) => `• ${a}`).join('\n')}`,
            createdBy: 'AI Signal Processor',
            updatedBy: 'AI Signal Processor',
          });
          autoCreatedDealId = newOppId;
          autoCreatedDealName = aiResult.customerName;

          // Create tasks on the new opportunity
          if (aiResult.actionItems?.length > 0) {
            for (const action of aiResult.actionItems.slice(0, 5)) {
              try {
                const taskId = `task-auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
                // Add as sub-task directly on the opportunity
                await Opp.findOneAndUpdate(
                  { id: newOppId },
                  { $push: { subTasks: {
                    opportunityId: newOppId,
                    name: action.slice(0, 150),
                    owner: aiResult.contactName || 'Unassigned',
                    dueDate: new Date(Date.now() + 7 * 86400000),
                    priority: aiResult.urgency === 'high' ? 'High' : 'Medium',
                    status: 'pending',
                  } } },
                );
              } catch { /* best effort */ }
            }
          }

          // Log activity for the auto-creation
          if (Activity) {
            await Activity.create({
              type: 'deal_created',
              entityType: 'opportunity',
              entityId: newOppId,
              entityName: aiResult.customerName,
              description: `AI auto-created opportunity from Outlook signal: ${aiResult.customerName}`,
              userName: 'AI Signal Processor',
            });
          }
        }
      } catch (e) {
        // Auto-creation failed — fall through to notification-only
      }
    }

    // Create notification — include auto-created deal info if applicable
    if (Notification) {
      const icon = aiResult?.sentiment === 'positive' ? '🟢' :
                   aiResult?.sentiment === 'negative' ? '🔴' : '🔵';
      const dealCreated = !!autoCreatedDealId && !aiResult?.matchedDealId;
      const dealLinked = !!aiResult?.matchedDealId;
      await Notification.create({
        userId: 'default-user',
        type: 'ai_signal',
        title: `${icon} ${autoCreatedDealId ? 'New Deal Created' : dealLinked ? 'Signal Linked' : 'Email Signal'}: ${aiResult?.customerName || subject || 'No subject'}`,
        message: aiResult?.summary || `From ${from}: ${(emailBody || '').slice(0, 150)}`,
        read: false,
        metadata: {
          source: 'outlook',
          matchedDealId: aiResult?.matchedDealId || autoCreatedDealId,
          matchedDealName: aiResult?.matchedDealName || autoCreatedDealName,
          customerName: aiResult?.customerName,
          contactName: aiResult?.contactName,
          intent: aiResult?.intent,
          urgency: aiResult?.urgency,
          sentiment: aiResult?.sentiment,
          actionItems: aiResult?.actionItems,
          autoCreated: !!autoCreatedDealId,
          status: autoCreatedDealId ? 'auto_created' : dealLinked ? 'linked' : 'pending_acceptance',
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: autoCreatedDealId
        ? `Opportunity auto-created for ${aiResult?.customerName}`
        : aiResult?.matchedDealId
          ? `Signal linked to ${aiResult.matchedDealName}`
          : 'Email processed — signal logged',
      result: {
        matched: !!aiResult?.matchedDealId,
        autoCreated: !!autoCreatedDealId,
        dealId: aiResult?.matchedDealId || autoCreatedDealId,
        dealName: aiResult?.matchedDealName || autoCreatedDealName,
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
