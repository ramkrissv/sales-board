/**
 * Microsoft Graph Client for Teams Integration
 *
 * Handles:
 * - OAuth token acquisition (client_credentials flow)
 * - Channel message subscriptions
 * - Meeting transcript retrieval
 * - Proactive message sending to channels
 * - User presence and activity
 */

const TENANT_ID = process.env.AZURE_AD_TENANT_ID || '';
const CLIENT_ID = process.env.AZURE_AD_CLIENT_ID || 'a0746e51-15c5-4a2e-867a-dae137e724f7';
const CLIENT_SECRET = process.env.AZURE_AD_CLIENT_SECRET || '';
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Get an access token for Microsoft Graph API
 */
export async function getGraphToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.token;
  }

  const res = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      scope: 'https://graph.microsoft.com/.default',
    }),
  });

  const data = await res.json();
  if (!data.access_token) throw new Error(`Graph token error: ${JSON.stringify(data)}`);

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };

  return cachedToken.token;
}

/**
 * Make an authenticated Graph API request
 */
export async function graphRequest(path: string, options?: { method?: string; body?: any }): Promise<any> {
  const token = await getGraphToken();
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    method: options?.method || 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Graph API ${res.status}: ${err}`);
  }

  return res.json();
}

/**
 * Send a proactive message (Adaptive Card) to a Teams channel
 */
export async function sendChannelMessage(teamId: string, channelId: string, card: any, text?: string): Promise<any> {
  return graphRequest(`/teams/${teamId}/channels/${channelId}/messages`, {
    method: 'POST',
    body: {
      body: {
        contentType: 'html',
        content: text || 'SalesPilot Update',
      },
      attachments: card ? [{
        id: '1',
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: JSON.stringify(card),
      }] : undefined,
    },
  });
}

/**
 * Send a proactive message to a user chat
 */
export async function sendUserMessage(userId: string, card: any, text?: string): Promise<any> {
  // Create or get 1:1 chat with the bot
  const chat = await graphRequest('/chats', {
    method: 'POST',
    body: {
      chatType: 'oneOnOne',
      members: [
        { '@odata.type': '#microsoft.graph.aadUserConversationMember', roles: ['owner'], 'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${userId}')` },
        { '@odata.type': '#microsoft.graph.aadUserConversationMember', roles: ['owner'], 'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${CLIENT_ID}')` },
      ],
    },
  });

  return graphRequest(`/chats/${chat.id}/messages`, {
    method: 'POST',
    body: {
      body: { contentType: 'html', content: text || 'SalesPilot Alert' },
      attachments: card ? [{
        id: '1',
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: JSON.stringify(card),
      }] : undefined,
    },
  });
}

/**
 * Subscribe to channel messages (webhook-based)
 */
export async function createMessageSubscription(teamId: string, channelId: string, webhookUrl: string): Promise<any> {
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour (max for channel messages)
  return graphRequest('/subscriptions', {
    method: 'POST',
    body: {
      changeType: 'created',
      notificationUrl: webhookUrl,
      resource: `/teams/${teamId}/channels/${channelId}/messages`,
      expirationDateTime: expiry.toISOString(),
      clientState: 'salespilot-signal',
    },
  });
}

/**
 * Get recent meeting transcripts for a user
 */
export async function getMeetingTranscripts(userId: string, limit: number = 5): Promise<any[]> {
  try {
    const meetings = await graphRequest(`/users/${userId}/onlineMeetings?$top=${limit}&$orderby=startDateTime desc`);
    const transcripts: any[] = [];

    for (const meeting of (meetings.value || []).slice(0, 3)) {
      try {
        const trans = await graphRequest(`/users/${userId}/onlineMeetings/${meeting.id}/transcripts`);
        if (trans.value?.length > 0) {
          const content = await graphRequest(`/users/${userId}/onlineMeetings/${meeting.id}/transcripts/${trans.value[0].id}/content?$format=text/vtt`);
          transcripts.push({
            meetingId: meeting.id,
            subject: meeting.subject,
            startDateTime: meeting.startDateTime,
            participants: meeting.participants?.attendees?.map((a: any) => a.identity?.user?.displayName) || [],
            transcript: typeof content === 'string' ? content : JSON.stringify(content),
          });
        }
      } catch { /* No transcript for this meeting */ }
    }

    return transcripts;
  } catch {
    return [];
  }
}

/**
 * Build an Adaptive Card for deal signal alerts
 */
export function buildDealSignalCard(params: {
  title: string;
  summary: string;
  dealName?: string;
  source: string;
  urgency: 'high' | 'medium' | 'low';
  actionItems?: string[];
  platformUrl?: string;
}): any {
  return {
    '$schema': 'http://adaptivecards.io/schemas/adaptive-card.json',
    type: 'AdaptiveCard',
    version: '1.4',
    body: [
      {
        type: 'ColumnSet',
        columns: [
          { type: 'Column', width: 'auto', items: [{ type: 'Image', url: 'https://salespilot.galent.ai/plugins/outlook/icon-64.png', size: 'Small' }] },
          { type: 'Column', width: 'stretch', items: [
            { type: 'TextBlock', text: params.title, weight: 'Bolder', size: 'Medium', wrap: true },
            { type: 'TextBlock', text: `Source: ${params.source} · ${params.urgency} urgency`, size: 'Small', isSubtle: true },
          ]},
        ],
      },
      ...(params.dealName ? [{ type: 'TextBlock' as const, text: `Deal: **${params.dealName}**`, size: 'Small' as const }] : []),
      { type: 'TextBlock', text: params.summary, wrap: true, size: 'Small' },
      ...(params.actionItems?.length ? [{
        type: 'FactSet' as const,
        facts: params.actionItems.slice(0, 3).map((a, i) => ({ title: `Action ${i + 1}`, value: a })),
      }] : []),
    ],
    actions: [
      ...(params.platformUrl ? [{ type: 'Action.OpenUrl', title: 'Open in SalesPilot', url: params.platformUrl }] : []),
      { type: 'Action.Submit', title: 'Accept Signal', data: { action: 'accept_signal', deal: params.dealName } },
      { type: 'Action.Submit', title: 'Dismiss', data: { action: 'dismiss_signal' } },
    ],
  };
}

/**
 * Build card for meeting recap
 */
export function buildMeetingRecapCard(params: {
  meetingSubject: string;
  participants: string[];
  summary: string;
  actionItems: string[];
  dealMatch?: string;
  sentiment?: string;
}): any {
  return {
    '$schema': 'http://adaptivecards.io/schemas/adaptive-card.json',
    type: 'AdaptiveCard',
    version: '1.4',
    body: [
      { type: 'TextBlock', text: 'Meeting Recap', weight: 'Bolder', size: 'Medium', color: 'Accent' },
      { type: 'TextBlock', text: params.meetingSubject, weight: 'Bolder', wrap: true },
      { type: 'TextBlock', text: `Participants: ${params.participants.join(', ')}`, size: 'Small', isSubtle: true, wrap: true },
      ...(params.dealMatch ? [{ type: 'TextBlock' as const, text: `Matched Deal: **${params.dealMatch}**`, size: 'Small' as const, color: 'Good' as const }] : []),
      { type: 'TextBlock', text: params.summary, wrap: true, size: 'Small' },
      ...(params.actionItems.length > 0 ? [{
        type: 'FactSet' as const,
        facts: params.actionItems.map((a, i) => ({ title: `${i + 1}`, value: a })),
      }] : []),
    ],
    actions: [
      { type: 'Action.Submit', title: 'Accept & Create Tasks', data: { action: 'accept_recap', actionItems: params.actionItems, deal: params.dealMatch } },
      { type: 'Action.OpenUrl', title: 'Open SalesPilot', url: 'https://salespilot.galent.ai' },
    ],
  };
}
