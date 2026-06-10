import mongoose from 'mongoose';
import { connectDB } from './connection';
import { Opportunity } from './models/opportunity';
import { Account } from './models/account';
import { Workflow } from './models/workflow';
import { GraphService } from '../graph/graph-service';

// ─── 1. Accounts ────────────────────────────────────────────────────────────

const accountsData = [
  {
    companyName: 'Brightspeed',
    website: 'https://brightspeed.com',
    industry: 'Technology',
    accountType: 'Strategic',
    hqLocation: 'Charlotte, NC',
    employeeCount: 4000,
    annualRevenue: 2000000000,
    techStack: ['PHP', 'AWS', 'Salesforce'],
    description: 'Fiber internet provider, post-Lumen spinoff',
    accountHealth: 85,
    penetration: 40,
  },
  {
    companyName: 'Motion Industries',
    website: 'https://motionindustries.com',
    industry: 'Manufacturing',
    accountType: 'Enterprise',
    hqLocation: 'Birmingham, AL',
    employeeCount: 10000,
    annualRevenue: 7000000000,
    techStack: ['SAP', 'Azure', 'Snowflake'],
    description: 'Industrial distribution, subsidiary of Genuine Parts',
    accountHealth: 78,
    penetration: 25,
  },
  {
    companyName: 'HNI Corporation',
    website: 'https://hnicorp.com',
    industry: 'Manufacturing',
    accountType: 'Enterprise',
    hqLocation: 'Muscatine, IA',
    employeeCount: 8000,
    annualRevenue: 2200000000,
    techStack: ['ServiceNow', 'Azure'],
    description: 'Workplace furnishings and residential building products',
    accountHealth: 72,
    penetration: 30,
  },
  {
    companyName: 'Wells Fargo',
    website: 'https://wellsfargo.com',
    industry: 'Financial Services',
    accountType: 'Strategic',
    hqLocation: 'San Francisco, CA',
    employeeCount: 230000,
    annualRevenue: 78000000000,
    techStack: ['Java', 'AWS', 'Kubernetes', 'Kafka'],
    description: 'Multinational financial services company',
    accountHealth: 60,
    penetration: 5,
  },
  {
    companyName: 'Fannie Mae',
    website: 'https://fanniemae.com',
    industry: 'Financial Services',
    accountType: 'Enterprise',
    hqLocation: 'Washington, DC',
    employeeCount: 8000,
    annualRevenue: 28000000000,
    techStack: ['AWS', 'Python', 'React'],
    description: 'Government-sponsored mortgage finance enterprise',
    accountHealth: 55,
    penetration: 10,
  },
];

// ─── 2. Workflows ───────────────────────────────────────────────────────────

const workflowsData = [
  {
    name: 'Discovery Checklist',
    description: 'Auto-create research tasks when a new deal enters Discovery',
    isActive: true,
    mode: 'manual',
    trigger: { type: 'deal_stage_change', config: { toStage: 'Discovery' } },
    conditions: [],
    actions: [
      { type: 'create_task', config: { name: 'Research company background', priority: 'High' } },
      { type: 'create_task', config: { name: 'Identify decision makers', priority: 'High' } },
    ],
    executionCount: 12,
    successRate: 95,
  },
  {
    name: 'Stale Deal Alert',
    description: 'Notify owner when deal has no activity for 14+ days',
    isActive: true,
    mode: 'agentic',
    trigger: { type: 'schedule', config: { frequency: 'daily' } },
    conditions: [{ type: 'inactivity', config: { days: 14 } }],
    actions: [
      { type: 'send_notification', config: { message: 'Deal inactive for 14+ days' } },
    ],
    executionCount: 45,
    successRate: 100,
  },
  {
    name: 'Win Handoff',
    description: 'Create delivery tasks when deal moves to Won',
    isActive: true,
    mode: 'manual',
    trigger: { type: 'deal_stage_change', config: { toStage: 'Won' } },
    conditions: [],
    actions: [
      { type: 'create_task', config: { name: 'Schedule delivery kickoff', priority: 'High' } },
      { type: 'send_notification', config: { message: 'Deal won! Delivery team notified.' } },
    ],
    executionCount: 7,
    successRate: 100,
  },
];

// ─── Main seed function ─────────────────────────────────────────────────────

async function seedAll() {
  await connectDB();
  console.log('Connected to MongoDB');

  // ── Accounts (idempotent — upsert by companyName) ──
  console.log('\n--- Seeding Accounts ---');
  const accountMap: Record<string, mongoose.Types.ObjectId> = {};

  for (const acct of accountsData) {
    const existing = await Account.findOne({ companyName: acct.companyName });
    if (existing) {
      console.log(`  Account "${acct.companyName}" already exists, updating...`);
      await Account.updateOne({ companyName: acct.companyName }, { $set: acct });
      accountMap[acct.companyName] = existing._id as mongoose.Types.ObjectId;
    } else {
      const created = await Account.create(acct);
      console.log(`  Created account: ${acct.companyName}`);
      accountMap[acct.companyName] = created._id as mongoose.Types.ObjectId;
    }
  }

  // ── Link opportunities to accounts ──
  console.log('\n--- Linking Opportunities to Accounts ---');
  for (const [companyName, accountId] of Object.entries(accountMap)) {
    const result = await Opportunity.updateMany(
      { customerName: companyName, accountId: { $exists: false } },
      { $set: { accountId } }
    );
    // Also update opportunities that have accountId: null
    const result2 = await Opportunity.updateMany(
      { customerName: companyName, accountId: null },
      { $set: { accountId } }
    );
    const total = (result.modifiedCount || 0) + (result2.modifiedCount || 0);
    if (total > 0) {
      console.log(`  Linked ${total} opportunities for "${companyName}" to account ${accountId}`);
    }
  }

  // ── Knowledge Graph ──
  console.log('\n--- Syncing Knowledge Graph ---');
  const opportunities = await Opportunity.find({}).lean();
  for (const opp of opportunities) {
    try {
      await GraphService.syncOpportunityToGraph(opp);
      console.log(`  Graph: synced opportunity "${opp.opportunityName}"`);
    } catch (err: any) {
      console.log(`  Graph: skipped opportunity "${opp.opportunityName}" — ${err.message}`);
    }
  }

  // Sync stakeholders
  const StakeholderModel =
    mongoose.models.Stakeholder ||
    mongoose.model(
      'Stakeholder',
      new mongoose.Schema({
        opportunityId: String,
        name: String,
        title: String,
        email: String,
        phone: String,
        linkedInUrl: String,
        isPrimaryContact: Boolean,
        isDecisionMaker: Boolean,
        notes: String,
      })
    );

  const stakeholders = await StakeholderModel.find({}).lean();
  for (const sh of stakeholders) {
    try {
      await GraphService.syncStakeholderToGraph(sh, (sh as any).opportunityId);
      console.log(`  Graph: synced stakeholder "${(sh as any).name}"`);
    } catch (err: any) {
      console.log(`  Graph: skipped stakeholder "${(sh as any).name}" — ${err.message}`);
    }
  }

  // ── Workflows (idempotent — check by name) ──
  console.log('\n--- Seeding Workflows ---');
  for (const wf of workflowsData) {
    const existing = await Workflow.findOne({ name: wf.name });
    if (existing) {
      console.log(`  Workflow "${wf.name}" already exists, skipping.`);
    } else {
      await Workflow.create(wf);
      console.log(`  Created workflow: ${wf.name}`);
    }
  }

  console.log('\n✓ Seed-all complete!');
}

// ─── Run ────────────────────────────────────────────────────────────────────

seedAll()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed-all failed:', err);
    process.exit(1);
  });
