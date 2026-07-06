/**
 * Salesforce Integration — OAuth2 + bidirectional sync.
 * Connects SalesPilot to Salesforce Lightning for opportunity, contact, and account sync.
 */

const SF_LOGIN_URL = process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com';
const SF_CLIENT_ID = process.env.SALESFORCE_CLIENT_ID || '';
const SF_CLIENT_SECRET = process.env.SALESFORCE_CLIENT_SECRET || '';
const SF_REDIRECT_URI = process.env.SALESFORCE_REDIRECT_URI || 'https://salespilot.galent.ai/api/salesforce/callback';

interface SFToken {
  access_token: string;
  refresh_token: string;
  instance_url: string;
  id: string;
  issued_at: string;
}

/** Get Salesforce OAuth2 authorization URL */
export function getSFAuthUrl(): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: SF_CLIENT_ID,
    redirect_uri: SF_REDIRECT_URI,
    scope: 'full refresh_token',
  });
  return `${SF_LOGIN_URL}/services/oauth2/authorize?${params.toString()}`;
}

/** Exchange auth code for access token */
export async function exchangeCodeForToken(code: string): Promise<SFToken> {
  const res = await fetch(`${SF_LOGIN_URL}/services/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: SF_CLIENT_ID,
      client_secret: SF_CLIENT_SECRET,
      redirect_uri: SF_REDIRECT_URI,
      code,
    }).toString(),
  });
  if (!res.ok) throw new Error(`SF token exchange failed: ${res.status}`);
  return res.json();
}

/** Refresh an expired access token */
export async function refreshToken(refresh_token: string): Promise<SFToken> {
  const res = await fetch(`${SF_LOGIN_URL}/services/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: SF_CLIENT_ID,
      client_secret: SF_CLIENT_SECRET,
      refresh_token,
    }).toString(),
  });
  if (!res.ok) throw new Error(`SF token refresh failed: ${res.status}`);
  return res.json();
}

/** Make an authenticated Salesforce REST API call */
export async function sfApiCall(token: SFToken, method: string, path: string, body?: any): Promise<any> {
  const res = await fetch(`${token.instance_url}/services/data/v59.0${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${token.access_token}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (res.status === 401) {
    throw new Error('SF_TOKEN_EXPIRED');
  }
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`SF API error ${res.status}: ${error}`);
  }
  if (res.status === 204) return null; // No content (e.g., DELETE)
  return res.json();
}

/** Query Salesforce using SOQL */
export async function sfQuery(token: SFToken, soql: string): Promise<any> {
  return sfApiCall(token, 'GET', `/query?q=${encodeURIComponent(soql)}`);
}

// ═══════ SYNC OPERATIONS ═══════

/** Fetch all opportunities from Salesforce */
export async function fetchSFOpportunities(token: SFToken): Promise<any[]> {
  const result = await sfQuery(token,
    `SELECT Id, Name, StageName, Amount, CloseDate, AccountId, Account.Name,
     OwnerId, Owner.Name, Description, Type, LeadSource, Probability,
     CreatedDate, LastModifiedDate
     FROM Opportunity
     WHERE IsClosed = false
     ORDER BY LastModifiedDate DESC
     LIMIT 200`
  );
  return result.records || [];
}

/** Fetch all contacts from Salesforce */
export async function fetchSFContacts(token: SFToken, accountId?: string): Promise<any[]> {
  const where = accountId ? `WHERE AccountId = '${accountId}'` : '';
  const result = await sfQuery(token,
    `SELECT Id, FirstName, LastName, Title, Email, Phone, AccountId, Account.Name,
     Department, MailingCity, MailingState
     FROM Contact ${where}
     ORDER BY LastModifiedDate DESC
     LIMIT 500`
  );
  return result.records || [];
}

/** Fetch all accounts from Salesforce */
export async function fetchSFAccounts(token: SFToken): Promise<any[]> {
  const result = await sfQuery(token,
    `SELECT Id, Name, Industry, Type, BillingCity, BillingState, Website,
     NumberOfEmployees, AnnualRevenue, OwnerId, Owner.Name,
     CreatedDate, LastModifiedDate
     FROM Account
     ORDER BY LastModifiedDate DESC
     LIMIT 500`
  );
  return result.records || [];
}

/** Create an opportunity in Salesforce */
export async function createSFOpportunity(token: SFToken, data: {
  Name: string;
  StageName: string;
  CloseDate: string;
  Amount?: number;
  AccountId?: string;
  Description?: string;
}): Promise<any> {
  return sfApiCall(token, 'POST', '/sobjects/Opportunity', data);
}

/** Update an opportunity in Salesforce */
export async function updateSFOpportunity(token: SFToken, sfId: string, data: any): Promise<void> {
  await sfApiCall(token, 'PATCH', `/sobjects/Opportunity/${sfId}`, data);
}

/** Map SalesPilot opportunity to Salesforce format */
export function mapToSF(opp: any): any {
  const stageMap: Record<string, string> = {
    'Discovery': 'Qualification',
    'Qualification': 'Needs Analysis',
    'Proposal': 'Proposal/Price Quote',
    'Negotiation': 'Negotiation/Review',
    'Won': 'Closed Won',
    'Lost': 'Closed Lost',
  };
  return {
    Name: `${opp.customerName} — ${opp.opportunityName}`,
    StageName: stageMap[opp.status] || opp.status,
    CloseDate: opp.expectedCloseDate?.split('T')[0] || new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
    Amount: opp.tcv || 0,
    Description: opp.conversationLog?.slice(0, 500) || '',
  };
}

/** Map Salesforce opportunity to SalesPilot format */
export function mapFromSF(sfOpp: any): any {
  const stageMap: Record<string, string> = {
    'Qualification': 'Discovery',
    'Needs Analysis': 'Qualification',
    'Proposal/Price Quote': 'Proposal',
    'Negotiation/Review': 'Negotiation',
    'Closed Won': 'Won',
    'Closed Lost': 'Lost',
  };
  return {
    customerName: sfOpp.Account?.Name || sfOpp.Name?.split(' — ')[0] || 'Unknown',
    opportunityName: sfOpp.Name || 'Untitled',
    status: stageMap[sfOpp.StageName] || sfOpp.StageName || 'Discovery',
    tcv: sfOpp.Amount || 0,
    expectedCloseDate: sfOpp.CloseDate || new Date(Date.now() + 90 * 86400000).toISOString(),
    primaryOwner: sfOpp.Owner?.Name || '',
    source: 'Salesforce',
    sfId: sfOpp.Id,
  };
}
