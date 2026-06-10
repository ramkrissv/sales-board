/**
 * Salesforce Bidirectional Sync Engine
 *
 * Maps Galent opportunities ↔ Salesforce opportunities.
 * Handles conflict resolution with "last-write-wins" + audit log.
 *
 * Usage:
 *   const sync = new SalesforceSync({ instanceUrl, accessToken });
 *   await sync.pullFromSalesforce();  // SF → Galent
 *   await sync.pushToSalesforce(oppId); // Galent → SF
 *   await sync.fullSync(); // Bidirectional
 */

import mongoose from 'mongoose';

// Field mapping: Galent ↔ Salesforce
const FIELD_MAP: Record<string, string> = {
  // Galent field → Salesforce field
  'customerName': 'Account.Name',
  'opportunityName': 'Name',
  'tcv': 'Amount',
  'status': 'StageName',
  'expectedCloseDate': 'CloseDate',
  'primaryOwner': 'Owner.Name',
  'industry': 'Account.Industry',
  'source': 'LeadSource',
  'probability': 'Probability',
};

// Stage mapping: Galent stages ↔ Salesforce stages
const STAGE_MAP: Record<string, string> = {
  'Discovery': 'Prospecting',
  'Qualification': 'Qualification',
  'Proposal': 'Proposal/Price Quote',
  'Negotiation': 'Negotiation/Review',
  'Won': 'Closed Won',
  'Lost': 'Closed Lost',
  'On Hold': 'On Hold',
};
const REVERSE_STAGE_MAP = Object.fromEntries(Object.entries(STAGE_MAP).map(([k, v]) => [v, k]));

interface SyncConfig {
  instanceUrl: string;
  accessToken: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
}

interface SyncLog {
  timestamp: Date;
  direction: 'pull' | 'push';
  entity: string;
  entityId: string;
  fields: string[];
  status: 'success' | 'conflict' | 'error';
  details?: string;
}

export class SalesforceSync {
  private config: SyncConfig;
  private logs: SyncLog[] = [];

  constructor(config: SyncConfig) {
    this.config = config;
  }

  /**
   * Make an authenticated request to Salesforce REST API
   */
  private async sfRequest(path: string, method = 'GET', body?: any): Promise<any> {
    const url = `${this.config.instanceUrl}/services/data/v59.0${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Salesforce API error ${res.status}: ${error}`);
    }

    return method === 'DELETE' ? null : res.json();
  }

  /**
   * Query Salesforce using SOQL
   */
  async query(soql: string): Promise<any[]> {
    const result = await this.sfRequest(`/query?q=${encodeURIComponent(soql)}`);
    return result.records || [];
  }

  /**
   * Pull opportunities from Salesforce into Galent
   */
  async pullFromSalesforce(lastSyncAt?: Date): Promise<{ created: number; updated: number; errors: number }> {
    const since = lastSyncAt ? lastSyncAt.toISOString() : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const soql = `
      SELECT Id, Name, Amount, StageName, CloseDate, Probability,
             Account.Name, Account.Industry, Owner.Name, LeadSource,
             LastModifiedDate
      FROM Opportunity
      WHERE LastModifiedDate > ${since}
      ORDER BY LastModifiedDate DESC
      LIMIT 200
    `;

    const sfOpps = await this.query(soql);
    const Opportunity = mongoose.models.Opportunity;
    if (!Opportunity) throw new Error('Opportunity model not loaded');

    let created = 0, updated = 0, errors = 0;

    for (const sfOpp of sfOpps) {
      try {
        // Check if we already have this SF opportunity
        const existing = await Opportunity.findOne({ 'metadata.salesforceId': sfOpp.Id });

        const galentData: any = {
          customerName: sfOpp.Account?.Name || 'Unknown',
          opportunityName: sfOpp.Name,
          tcv: sfOpp.Amount || 0,
          status: REVERSE_STAGE_MAP[sfOpp.StageName] || 'Discovery',
          expectedCloseDate: sfOpp.CloseDate ? new Date(sfOpp.CloseDate) : new Date(),
          primaryOwner: sfOpp.Owner?.Name || 'Unassigned',
          industry: sfOpp.Account?.Industry || 'Technology',
          source: sfOpp.LeadSource || 'Salesforce',
          metadata: { salesforceId: sfOpp.Id, lastSFModified: sfOpp.LastModifiedDate },
        };

        if (existing) {
          // Conflict resolution: if SF was modified more recently, SF wins
          const sfModified = new Date(sfOpp.LastModifiedDate);
          const galentModified = existing.updatedAt;
          if (sfModified > galentModified) {
            await Opportunity.findByIdAndUpdate(existing._id, { $set: galentData });
            updated++;
            this.log('pull', 'opportunity', sfOpp.Id, Object.keys(galentData), 'success');
          } else {
            this.log('pull', 'opportunity', sfOpp.Id, [], 'conflict', 'Galent version is newer — skipped');
          }
        } else {
          // Create new opportunity in Galent
          const year = new Date().getFullYear();
          await Opportunity.create({
            id: `SF-${year}-${sfOpp.Id.slice(-4)}`,
            ...galentData,
            startDate: new Date(),
            dealDuration: '12 months',
            region: 'North America',
            salesPOCs: [],
            presalesPOCs: [],
            customTags: ['salesforce-sync'],
            conversationLog: '',
            activityLog: [],
          });
          created++;
          this.log('pull', 'opportunity', sfOpp.Id, Object.keys(galentData), 'success', 'Created new');
        }
      } catch (e: any) {
        errors++;
        this.log('pull', 'opportunity', sfOpp.Id, [], 'error', e.message);
      }
    }

    return { created, updated, errors };
  }

  /**
   * Push a Galent opportunity to Salesforce
   */
  async pushToSalesforce(opportunityId: string): Promise<{ status: 'created' | 'updated' | 'error'; sfId?: string }> {
    const Opportunity = mongoose.models.Opportunity;
    if (!Opportunity) throw new Error('Opportunity model not loaded');

    const opp = await Opportunity.findOne({ id: opportunityId }) || await Opportunity.findById(opportunityId);
    if (!opp) throw new Error(`Opportunity ${opportunityId} not found`);

    const sfData: any = {
      Name: opp.opportunityName,
      Amount: opp.tcv || 0,
      StageName: STAGE_MAP[opp.status] || 'Prospecting',
      CloseDate: opp.expectedCloseDate ? new Date(opp.expectedCloseDate).toISOString().split('T')[0] : undefined,
      LeadSource: opp.source || 'Other',
    };

    try {
      const sfId = opp.metadata?.salesforceId;
      if (sfId) {
        // Update existing SF opportunity
        await this.sfRequest(`/sobjects/Opportunity/${sfId}`, 'PATCH', sfData);
        this.log('push', 'opportunity', opportunityId, Object.keys(sfData), 'success');
        return { status: 'updated', sfId };
      } else {
        // Create new in Salesforce
        const result = await this.sfRequest('/sobjects/Opportunity', 'POST', sfData);
        // Save the SF ID back to Galent
        await Opportunity.findByIdAndUpdate(opp._id, {
          $set: { 'metadata.salesforceId': result.id },
        });
        this.log('push', 'opportunity', opportunityId, Object.keys(sfData), 'success', `Created SF: ${result.id}`);
        return { status: 'created', sfId: result.id };
      }
    } catch (e: any) {
      this.log('push', 'opportunity', opportunityId, [], 'error', e.message);
      return { status: 'error' };
    }
  }

  /**
   * Full bidirectional sync
   */
  async fullSync(lastSyncAt?: Date): Promise<{ pull: any; push: any }> {
    // Pull first (SF → Galent)
    const pullResult = await this.pullFromSalesforce(lastSyncAt);

    // Then push modified Galent records to SF
    const Opportunity = mongoose.models.Opportunity;
    const modifiedSince = lastSyncAt || new Date(Date.now() - 24 * 60 * 60 * 1000);
    const modifiedOpps = await Opportunity.find({
      updatedAt: { $gte: modifiedSince },
      'metadata.salesforceId': { $exists: true },
    }).lean();

    let pushCreated = 0, pushUpdated = 0, pushErrors = 0;
    for (const opp of modifiedOpps) {
      const result = await this.pushToSalesforce((opp as any).id || (opp as any)._id.toString());
      if (result.status === 'created') pushCreated++;
      else if (result.status === 'updated') pushUpdated++;
      else pushErrors++;
    }

    return {
      pull: pullResult,
      push: { created: pushCreated, updated: pushUpdated, errors: pushErrors },
    };
  }

  private log(direction: 'pull' | 'push', entity: string, entityId: string, fields: string[], status: SyncLog['status'], details?: string) {
    this.logs.push({ timestamp: new Date(), direction, entity, entityId, fields, status, details });
  }

  getLogs(): SyncLog[] {
    return this.logs;
  }
}
