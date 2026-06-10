/**
 * Universal Sync Engine
 *
 * Platform-agnostic bidirectional sync that works with any CRM, project management,
 * or business tool. Each platform registers an adapter with field mappings,
 * auth config, and API methods.
 *
 * Supported patterns:
 * - REST API (Salesforce, HubSpot, Pipedrive, Zoho, etc.)
 * - GraphQL (Monday.com, Linear, etc.)
 * - Webhook-based (Slack, Teams, Zapier, etc.)
 * - File-based (CSV import/export)
 *
 * Usage:
 *   const engine = new UniversalSync();
 *   engine.registerAdapter('hubspot', hubspotAdapter);
 *   await engine.pull('hubspot');
 *   await engine.push('hubspot', oppId);
 *   await engine.fullSync('hubspot');
 */

import mongoose from 'mongoose';

// ── Types ──

export interface FieldMapping {
  galentField: string;
  externalField: string;
  transform?: 'direct' | 'date' | 'currency' | 'stage' | 'custom';
  customTransform?: (value: any, direction: 'pull' | 'push') => any;
}

export interface StageMapping {
  galentStage: string;
  externalStage: string;
}

export interface SyncAdapter {
  id: string;
  name: string;
  type: 'rest' | 'graphql' | 'webhook' | 'file';

  // Auth
  auth: {
    method: 'oauth2' | 'api_key' | 'bearer' | 'basic' | 'custom';
    config: Record<string, string>;
  };

  // Mappings
  fieldMappings: FieldMapping[];
  stageMappings: StageMapping[];

  // API methods — each adapter implements these
  fetchRecords: (since?: Date) => Promise<ExternalRecord[]>;
  createRecord: (data: Record<string, any>) => Promise<{ externalId: string }>;
  updateRecord: (externalId: string, data: Record<string, any>) => Promise<void>;
  deleteRecord?: (externalId: string) => Promise<void>;
  testConnection: () => Promise<{ connected: boolean; message: string }>;
}

export interface ExternalRecord {
  externalId: string;
  data: Record<string, any>;
  lastModified: Date;
}

export interface SyncResult {
  adapter: string;
  direction: 'pull' | 'push' | 'full';
  timestamp: Date;
  created: number;
  updated: number;
  skipped: number;
  errors: { id: string; error: string }[];
  duration: number;
}

// ── Built-in Adapters ──

export function createRESTAdapter(config: {
  id: string;
  name: string;
  baseUrl: string;
  authHeader: string;
  listEndpoint: string;
  createEndpoint: string;
  updateEndpoint: (id: string) => string;
  fieldMappings: FieldMapping[];
  stageMappings: StageMapping[];
  parseResponse: (data: any) => ExternalRecord[];
  formatForCreate: (galentData: Record<string, any>) => Record<string, any>;
}): SyncAdapter {
  return {
    id: config.id,
    name: config.name,
    type: 'rest',
    auth: { method: 'bearer', config: { token: config.authHeader } },
    fieldMappings: config.fieldMappings,
    stageMappings: config.stageMappings,

    async fetchRecords(since?: Date) {
      const url = since
        ? `${config.baseUrl}${config.listEndpoint}?modified_since=${since.toISOString()}`
        : `${config.baseUrl}${config.listEndpoint}`;

      const res = await fetch(url, {
        headers: {
          'Authorization': config.authHeader,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error(`${config.name} API error: ${res.status}`);
      const data = await res.json();
      return config.parseResponse(data);
    },

    async createRecord(data) {
      const formatted = config.formatForCreate(data);
      const res = await fetch(`${config.baseUrl}${config.createEndpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': config.authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formatted),
      });
      if (!res.ok) throw new Error(`Create failed: ${res.status}`);
      const result = await res.json();
      return { externalId: result.id || result.Id || result._id };
    },

    async updateRecord(externalId, data) {
      const formatted = config.formatForCreate(data);
      const res = await fetch(`${config.baseUrl}${config.updateEndpoint(externalId)}`, {
        method: 'PATCH',
        headers: {
          'Authorization': config.authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formatted),
      });
      if (!res.ok) throw new Error(`Update failed: ${res.status}`);
    },

    async testConnection() {
      try {
        const res = await fetch(`${config.baseUrl}${config.listEndpoint}?limit=1`, {
          headers: { 'Authorization': config.authHeader },
        });
        return { connected: res.ok, message: res.ok ? 'Connected' : `HTTP ${res.status}` };
      } catch (e: any) {
        return { connected: false, message: e.message };
      }
    },
  };
}

// ── Pre-built adapter factories ──

export const ADAPTER_TEMPLATES: Record<string, {
  name: string;
  description: string;
  requiredConfig: { key: string; label: string; type: string }[];
  createAdapter: (config: Record<string, string>) => SyncAdapter;
}> = {
  hubspot: {
    name: 'HubSpot',
    description: 'Sync deals, contacts, and companies from HubSpot CRM',
    requiredConfig: [
      { key: 'accessToken', label: 'Private App Access Token', type: 'password' },
    ],
    createAdapter: (cfg) => createRESTAdapter({
      id: 'hubspot',
      name: 'HubSpot',
      baseUrl: 'https://api.hubapi.com',
      authHeader: `Bearer ${cfg.accessToken}`,
      listEndpoint: '/crm/v3/objects/deals',
      createEndpoint: '/crm/v3/objects/deals',
      updateEndpoint: (id) => `/crm/v3/objects/deals/${id}`,
      fieldMappings: [
        { galentField: 'opportunityName', externalField: 'dealname', transform: 'direct' },
        { galentField: 'tcv', externalField: 'amount', transform: 'currency' },
        { galentField: 'expectedCloseDate', externalField: 'closedate', transform: 'date' },
        { galentField: 'status', externalField: 'dealstage', transform: 'stage' },
        { galentField: 'primaryOwner', externalField: 'hubspot_owner_id', transform: 'direct' },
      ],
      stageMappings: [
        { galentStage: 'Discovery', externalStage: 'appointmentscheduled' },
        { galentStage: 'Qualification', externalStage: 'qualifiedtobuy' },
        { galentStage: 'Proposal', externalStage: 'presentationscheduled' },
        { galentStage: 'Negotiation', externalStage: 'decisionmakerboughtin' },
        { galentStage: 'Won', externalStage: 'closedwon' },
        { galentStage: 'Lost', externalStage: 'closedlost' },
      ],
      parseResponse: (data) => (data.results || []).map((d: any) => ({
        externalId: d.id,
        data: d.properties || {},
        lastModified: new Date(d.updatedAt || d.properties?.hs_lastmodifieddate),
      })),
      formatForCreate: (data) => ({ properties: data }),
    }),
  },

  pipedrive: {
    name: 'Pipedrive',
    description: 'Sync deals and activities from Pipedrive',
    requiredConfig: [
      { key: 'apiToken', label: 'API Token', type: 'password' },
      { key: 'domain', label: 'Company Domain', type: 'text' },
    ],
    createAdapter: (cfg) => createRESTAdapter({
      id: 'pipedrive',
      name: 'Pipedrive',
      baseUrl: `https://${cfg.domain}.pipedrive.com/api/v1`,
      authHeader: '',
      listEndpoint: `/deals?api_token=${cfg.apiToken}`,
      createEndpoint: `/deals?api_token=${cfg.apiToken}`,
      updateEndpoint: (id) => `/deals/${id}?api_token=${cfg.apiToken}`,
      fieldMappings: [
        { galentField: 'opportunityName', externalField: 'title', transform: 'direct' },
        { galentField: 'tcv', externalField: 'value', transform: 'currency' },
        { galentField: 'expectedCloseDate', externalField: 'expected_close_date', transform: 'date' },
        { galentField: 'status', externalField: 'stage_id', transform: 'stage' },
        { galentField: 'customerName', externalField: 'org_name', transform: 'direct' },
      ],
      stageMappings: [
        { galentStage: 'Discovery', externalStage: '1' },
        { galentStage: 'Qualification', externalStage: '2' },
        { galentStage: 'Proposal', externalStage: '3' },
        { galentStage: 'Negotiation', externalStage: '4' },
        { galentStage: 'Won', externalStage: 'won' },
        { galentStage: 'Lost', externalStage: 'lost' },
      ],
      parseResponse: (data) => (data.data || []).map((d: any) => ({
        externalId: String(d.id),
        data: d,
        lastModified: new Date(d.update_time),
      })),
      formatForCreate: (data) => data,
    }),
  },

  zoho: {
    name: 'Zoho CRM',
    description: 'Sync deals and contacts from Zoho CRM',
    requiredConfig: [
      { key: 'accessToken', label: 'Access Token', type: 'password' },
      { key: 'domain', label: 'API Domain', type: 'text' },
    ],
    createAdapter: (cfg) => createRESTAdapter({
      id: 'zoho',
      name: 'Zoho CRM',
      baseUrl: `https://${cfg.domain || 'www.zohoapis.com'}/crm/v2`,
      authHeader: `Zoho-oauthtoken ${cfg.accessToken}`,
      listEndpoint: '/Deals',
      createEndpoint: '/Deals',
      updateEndpoint: (id) => `/Deals/${id}`,
      fieldMappings: [
        { galentField: 'opportunityName', externalField: 'Deal_Name', transform: 'direct' },
        { galentField: 'tcv', externalField: 'Amount', transform: 'currency' },
        { galentField: 'expectedCloseDate', externalField: 'Closing_Date', transform: 'date' },
        { galentField: 'status', externalField: 'Stage', transform: 'stage' },
        { galentField: 'customerName', externalField: 'Account_Name', transform: 'direct' },
      ],
      stageMappings: [
        { galentStage: 'Discovery', externalStage: 'Qualification' },
        { galentStage: 'Qualification', externalStage: 'Needs Analysis' },
        { galentStage: 'Proposal', externalStage: 'Proposal/Price Quote' },
        { galentStage: 'Negotiation', externalStage: 'Negotiation/Review' },
        { galentStage: 'Won', externalStage: 'Closed Won' },
        { galentStage: 'Lost', externalStage: 'Closed Lost' },
      ],
      parseResponse: (data) => (data.data || []).map((d: any) => ({
        externalId: d.id,
        data: d,
        lastModified: new Date(d.Modified_Time),
      })),
      formatForCreate: (data) => ({ data: [data] }),
    }),
  },

  freshsales: {
    name: 'Freshsales',
    description: 'Sync deals from Freshworks Freshsales',
    requiredConfig: [
      { key: 'apiKey', label: 'API Key', type: 'password' },
      { key: 'domain', label: 'Freshsales Domain', type: 'text' },
    ],
    createAdapter: (cfg) => createRESTAdapter({
      id: 'freshsales',
      name: 'Freshsales',
      baseUrl: `https://${cfg.domain}.freshsales.io/api`,
      authHeader: `Token token=${cfg.apiKey}`,
      listEndpoint: '/deals/view/all',
      createEndpoint: '/deals',
      updateEndpoint: (id) => `/deals/${id}`,
      fieldMappings: [
        { galentField: 'opportunityName', externalField: 'name', transform: 'direct' },
        { galentField: 'tcv', externalField: 'amount', transform: 'currency' },
        { galentField: 'expectedCloseDate', externalField: 'expected_close', transform: 'date' },
        { galentField: 'status', externalField: 'deal_stage_id', transform: 'stage' },
      ],
      stageMappings: [
        { galentStage: 'Discovery', externalStage: '1' },
        { galentStage: 'Qualification', externalStage: '2' },
        { galentStage: 'Proposal', externalStage: '3' },
        { galentStage: 'Negotiation', externalStage: '4' },
        { galentStage: 'Won', externalStage: '5' },
        { galentStage: 'Lost', externalStage: '6' },
      ],
      parseResponse: (data) => (data.deals || []).map((d: any) => ({
        externalId: String(d.id),
        data: d,
        lastModified: new Date(d.updated_at),
      })),
      formatForCreate: (data) => ({ deal: data }),
    }),
  },
};

// ── Universal Sync Engine ──

export class UniversalSync {
  private adapters: Map<string, SyncAdapter> = new Map();
  private syncHistory: SyncResult[] = [];

  registerAdapter(adapter: SyncAdapter) {
    this.adapters.set(adapter.id, adapter);
  }

  getAdapter(id: string): SyncAdapter | undefined {
    return this.adapters.get(id);
  }

  listAdapters(): { id: string; name: string; type: string }[] {
    return Array.from(this.adapters.values()).map(a => ({ id: a.id, name: a.name, type: a.type }));
  }

  /**
   * Pull records from external system into Galent
   */
  async pull(adapterId: string, since?: Date): Promise<SyncResult> {
    const start = Date.now();
    const adapter = this.adapters.get(adapterId);
    if (!adapter) throw new Error(`Adapter ${adapterId} not registered`);

    const result: SyncResult = {
      adapter: adapterId, direction: 'pull', timestamp: new Date(),
      created: 0, updated: 0, skipped: 0, errors: [], duration: 0,
    };

    try {
      const records = await adapter.fetchRecords(since);
      const Opportunity = mongoose.models.Opportunity;
      if (!Opportunity) throw new Error('Opportunity model not loaded');

      for (const record of records) {
        try {
          const galentData = this.mapToGalent(record.data, adapter);
          const existing = await Opportunity.findOne({
            [`metadata.${adapterId}Id`]: record.externalId,
          });

          if (existing) {
            if (record.lastModified > existing.updatedAt) {
              await Opportunity.findByIdAndUpdate(existing._id, { $set: galentData });
              result.updated++;
            } else {
              result.skipped++;
            }
          } else {
            const year = new Date().getFullYear();
            await Opportunity.create({
              id: `${adapterId.toUpperCase().slice(0, 2)}-${year}-${record.externalId.slice(-4)}`,
              ...galentData,
              startDate: new Date(),
              dealDuration: '12 months',
              region: 'North America',
              salesPOCs: [],
              presalesPOCs: [],
              customTags: [`${adapterId}-sync`],
              conversationLog: '',
              activityLog: [],
              metadata: { [`${adapterId}Id`]: record.externalId },
            });
            result.created++;
          }
        } catch (e: any) {
          result.errors.push({ id: record.externalId, error: e.message });
        }
      }
    } catch (e: any) {
      result.errors.push({ id: 'fetch', error: e.message });
    }

    result.duration = Date.now() - start;
    this.syncHistory.push(result);
    return result;
  }

  /**
   * Push a Galent record to external system
   */
  async push(adapterId: string, opportunityId: string): Promise<SyncResult> {
    const start = Date.now();
    const adapter = this.adapters.get(adapterId);
    if (!adapter) throw new Error(`Adapter ${adapterId} not registered`);

    const result: SyncResult = {
      adapter: adapterId, direction: 'push', timestamp: new Date(),
      created: 0, updated: 0, skipped: 0, errors: [], duration: 0,
    };

    try {
      const Opportunity = mongoose.models.Opportunity;
      const opp = await Opportunity.findOne({ id: opportunityId }) || await Opportunity.findById(opportunityId);
      if (!opp) throw new Error(`Opportunity ${opportunityId} not found`);

      const externalData = this.mapToExternal(opp.toObject(), adapter);
      const externalId = opp.metadata?.[`${adapterId}Id`];

      if (externalId) {
        await adapter.updateRecord(externalId, externalData);
        result.updated++;
      } else {
        const created = await adapter.createRecord(externalData);
        await Opportunity.findByIdAndUpdate(opp._id, {
          $set: { [`metadata.${adapterId}Id`]: created.externalId },
        });
        result.created++;
      }
    } catch (e: any) {
      result.errors.push({ id: opportunityId, error: e.message });
    }

    result.duration = Date.now() - start;
    this.syncHistory.push(result);
    return result;
  }

  /**
   * Full bidirectional sync
   */
  async fullSync(adapterId: string, since?: Date): Promise<{ pull: SyncResult; push: SyncResult }> {
    const pullResult = await this.pull(adapterId, since);

    // Push modified Galent records
    const Opportunity = mongoose.models.Opportunity;
    const modifiedSince = since || new Date(Date.now() - 24 * 60 * 60 * 1000);
    const modified = await Opportunity.find({
      updatedAt: { $gte: modifiedSince },
      [`metadata.${adapterId}Id`]: { $exists: true },
    }).lean();

    const pushResult: SyncResult = {
      adapter: adapterId, direction: 'push', timestamp: new Date(),
      created: 0, updated: 0, skipped: 0, errors: [], duration: 0,
    };
    const start = Date.now();

    for (const opp of modified) {
      try {
        const r = await this.push(adapterId, (opp as any).id || (opp as any)._id.toString());
        pushResult.created += r.created;
        pushResult.updated += r.updated;
        pushResult.errors.push(...r.errors);
      } catch (e: any) {
        pushResult.errors.push({ id: (opp as any).id, error: e.message });
      }
    }
    pushResult.duration = Date.now() - start;

    return { pull: pullResult, push: pushResult };
  }

  getHistory(): SyncResult[] {
    return this.syncHistory;
  }

  // ── Field mapping helpers ──

  private mapToGalent(externalData: Record<string, any>, adapter: SyncAdapter): Record<string, any> {
    const result: Record<string, any> = {};
    for (const mapping of adapter.fieldMappings) {
      const value = externalData[mapping.externalField];
      if (value === undefined || value === null) continue;

      if (mapping.transform === 'stage') {
        const stageMap = adapter.stageMappings.find(s => s.externalStage === String(value));
        result[mapping.galentField] = stageMap?.galentStage || 'Discovery';
      } else if (mapping.transform === 'date') {
        result[mapping.galentField] = new Date(value);
      } else if (mapping.transform === 'currency') {
        result[mapping.galentField] = Number(value) || 0;
      } else if (mapping.customTransform) {
        result[mapping.galentField] = mapping.customTransform(value, 'pull');
      } else {
        result[mapping.galentField] = value;
      }
    }
    return result;
  }

  private mapToExternal(galentData: Record<string, any>, adapter: SyncAdapter): Record<string, any> {
    const result: Record<string, any> = {};
    for (const mapping of adapter.fieldMappings) {
      const value = galentData[mapping.galentField];
      if (value === undefined || value === null) continue;

      if (mapping.transform === 'stage') {
        const stageMap = adapter.stageMappings.find(s => s.galentStage === value);
        result[mapping.externalField] = stageMap?.externalStage || value;
      } else if (mapping.transform === 'date') {
        result[mapping.externalField] = value instanceof Date ? value.toISOString().split('T')[0] : value;
      } else if (mapping.customTransform) {
        result[mapping.externalField] = mapping.customTransform(value, 'push');
      } else {
        result[mapping.externalField] = value;
      }
    }
    return result;
  }
}
