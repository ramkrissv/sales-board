/**
 * Salesforce CSV Sync — Import + Update opportunities from Salesforce CSV export
 *
 * Usage: npx tsx scripts/sync-salesforce-csv.ts [path-to-csv]
 *
 * This script:
 * 1. Reads the Salesforce CSV export
 * 2. Matches against existing opportunities by opportunityName (primary) or customerName+title (fallback)
 * 3. INSERTS new opportunities not found in the platform
 * 4. UPDATES existing opportunities with changed fields (stage, TCV, next step, owner, close date, etc.)
 * 5. Creates missing Account records
 * 6. Produces a detailed delta report
 */

import mongoose from 'mongoose';
import * as fs from 'fs';

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/galent';
const CSV_PATH = process.argv[2] || '/Users/ramakrishnan/Downloads/report1783595183999 (1).csv';

// ── Stage mapping ──
const STAGE_MAP: Record<string, string> = {
  'Signed': 'Won',
  'Qualifying': 'Qualification',
  'Proposal': 'Proposal',
  'Negotiation': 'Negotiation',
  'Prospecting': 'Discovery',
  'Closed Won': 'Won',
  'Closed Lost': 'Lost',
};

const FORECAST_MAP: Record<string, string> = {
  'Pipeline': 'pipeline',
  'Best Case': 'best_case',
  'Commit': 'commit',
  'Omitted': 'omitted',
};

// ── CSV parser (handles quoted fields with commas/newlines) ──
function parseCSV(text: string): Record<string, string>[] {
  const rows: Record<string, string>[] = [];
  const lines: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === '\n' && !inQuotes) {
      lines.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) lines.push(current);

  if (lines.length < 2) return rows;

  const headers = parseCSVLine(lines[0]);
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i]);
    if (vals.length === 0) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = (vals[idx] || '').trim(); });
    if (row['Opportunity Name'] || row['Account Name']) rows.push(row);
  }
  return rows;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current); current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields.map(f => f.trim().replace(/^"|"$/g, ''));
}

// ── Calculate TCV from available fields ──
function calcTCV(row: Record<string, string>): number {
  const fixed = parseFloat(row['Fixed Project Fee'] || '0') || 0;
  if (fixed > 0) return Math.round(fixed);

  const lifetime = parseFloat(row['Lifetime Revenue'] || '0') || 0;
  if (lifetime > 0) return Math.round(lifetime);

  const annual = parseFloat(row['Annual Revenue'] || '0') || 0;
  if (annual > 0) return Math.round(annual);

  const totalHourly = parseFloat(row['Total Hourly Bill Rate'] || '0') || 0;
  if (totalHourly > 0) return Math.round(totalHourly * 160 * 12);

  const fteFees = parseFloat(row['Total FTE Fees'] || '0') || 0;
  if (fteFees > 0) return Math.round(fteFees);

  return 0;
}

// ── Determine service line from engagement type ──
function getServiceLine(type: string, description: string): string {
  const d = (description || '').toLowerCase();
  if (type.includes('CWR') || type.includes('FTE')) return 'Staffing';
  if (d.includes('moderniz') || d.includes('legacy') || d.includes('migration')) return 'Legacy Modernization';
  if (d.includes('ai') || d.includes('ml') || d.includes('data')) return 'Data & AI';
  if (d.includes('test') || d.includes('qa') || d.includes('quality')) return 'Testing & QA';
  if (d.includes('cloud') || d.includes('gcp') || d.includes('infra')) return 'Cloud & Infrastructure';
  if (d.includes('support') || d.includes('managed') || d.includes('sre')) return 'Managed Services / SRE';
  return 'Data & AI'; // default for project delivery
}

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  Salesforce CSV → SalesPilot Sync            ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  // Read CSV
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`CSV not found: ${CSV_PATH}`);
    process.exit(1);
  }
  const csvText = fs.readFileSync(CSV_PATH, 'utf-8');
  const rows = parseCSV(csvText);
  console.log(`📄 Parsed ${rows.length} opportunities from CSV\n`);

  // Connect to MongoDB
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.\n');

  // Define schemas
  const OppSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    customerName: String,
    opportunityName: String,
    status: String,
    tcv: { type: Number, default: 0 },
    dealDuration: String,
    expectedCloseDate: Date,
    startDate: Date,
    primaryOwner: String,
    salesPOCs: [String],
    presalesPOCs: [String],
    conversationLog: { type: String, default: '' },
    industry: String,
    region: String,
    source: String,
    serviceLine: String,
    billingModel: String,
    clientType: String,
    opportunityType: String,
    engagementType: String,
    engagementTypes: [String],
    margin: Number,
    customTags: [String],
    activityLog: mongoose.Schema.Types.Mixed,
    metadata: mongoose.Schema.Types.Mixed,
    lifecyclePhase: String,
    forecastCategory: String,
    nextStep: String,
    stageEnteredDate: Date,
    lastActivityDate: Date,
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
    workshopId: String,
  }, { timestamps: true, strict: false });

  const AccountSchema = new mongoose.Schema({
    companyName: { type: String, required: true, unique: true },
    website: String,
    industry: String,
    employeeCount: Number,
    annualRevenue: Number,
    hqLocation: String,
    techStack: [String],
    description: String,
    accountType: String,
    accountHealth: Number,
    penetration: Number,
    territory: String,
    aiBrief: String,
    intentData: mongoose.Schema.Types.Mixed,
  }, { timestamps: true });

  const Opportunity = mongoose.models.Opportunity || mongoose.model('Opportunity', OppSchema);
  const Account = mongoose.models.Account || mongoose.model('Account', AccountSchema);

  // Load all existing opportunities
  const existingOpps = await Opportunity.find({}).lean();
  console.log(`📊 Existing opportunities in platform: ${existingOpps.length}`);

  // Build lookup maps
  const byName = new Map<string, any>();
  const byCustomerTitle = new Map<string, any>();
  for (const opp of existingOpps) {
    if (opp.opportunityName) byName.set(opp.opportunityName.toLowerCase().trim(), opp);
    const key = `${(opp.customerName || '').toLowerCase().trim()}::${(opp.opportunityName || '').toLowerCase().trim()}`;
    byCustomerTitle.set(key, opp);
  }

  // Track results
  const inserted: string[] = [];
  const updated: { name: string; changes: string[] }[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  // Load existing accounts
  const existingAccounts = await Account.find({}).lean();
  const accountMap = new Map(existingAccounts.map((a: any) => [a.companyName?.toLowerCase(), a]));
  const newAccounts: string[] = [];

  // Process each CSV row
  let nextId = existingOpps.length + 1;

  for (const row of rows) {
    const accountName = row['Account Name'] || 'Unknown';
    const oppName = row['Opportunity Name'] || 'Untitled';
    const sfStage = row['Stage'] || '';
    const stage = STAGE_MAP[sfStage] || sfStage || 'Discovery';
    const owner = row['Opportunity Owner'] || 'Unassigned';
    const type = row['Type'] || 'Galent - Project Delivery';
    const closeDate = row['Close Date'] ? new Date(row['Close Date']) : new Date();
    const createdDate = row['Created Date'] ? new Date(row['Created Date']) : new Date();
    const description = row['Description'] || '';
    const nextStep = row['Next Step'] || '';
    const country = row['Operating Country'] || 'United States';
    const forecastCat = FORECAST_MAP[row['Forecast Category'] || ''] || 'pipeline';
    const lastStageChange = row['Last Stage Change Date'] || '';
    const duration = row['Project Duration (In Months)'] || '';
    const annualRev = parseFloat(row['Annual Revenue'] || '0') || 0;
    const lifetimeRev = parseFloat(row['Lifetime Revenue'] || '0') || 0;
    const headcount = parseInt(row['Billing Demand Quantity'] || '0') || 0;
    const billRate = parseFloat(row['Bill Rate'] || '0') || 0;
    const totalHourly = parseFloat(row['Total Hourly Bill Rate'] || '0') || 0;
    const fteQty = parseInt(row['FTE Demand Quantity'] || '0') || 0;
    const fteFee = parseFloat(row['FTE Fee'] || '0') || 0;

    const tcv = calcTCV(row);
    const region = country.includes('India') && country.includes('United States') ? 'North America' :
                   country.includes('India') ? 'APAC' : 'North America';

    let engagementType = 'Project Delivery';
    if (type.includes('CWR')) engagementType = 'Staff Augmentation';
    else if (type.includes('FTE')) engagementType = 'FTE Hiring';

    const serviceLine = getServiceLine(type, description);

    // Try to find existing opportunity
    const lookupKey = oppName.toLowerCase().trim();
    const customerKey = `${accountName.toLowerCase().trim()}::${lookupKey}`;
    const existing = byName.get(lookupKey) || byCustomerTitle.get(customerKey);

    if (existing) {
      // ── UPDATE existing opportunity ──
      const changes: string[] = [];
      const updates: Record<string, any> = {};

      // Stage change
      if (existing.status !== stage) {
        changes.push(`stage: ${existing.status} → ${stage}`);
        updates.status = stage;
        updates.stageEnteredDate = lastStageChange ? new Date(lastStageChange) : new Date();
      }

      // TCV change (only if CSV has a higher value)
      if (tcv > 0 && Math.abs((existing.tcv || 0) - tcv) > 100) {
        changes.push(`tcv: $${(existing.tcv || 0).toLocaleString()} → $${tcv.toLocaleString()}`);
        updates.tcv = tcv;
      }

      // Owner change
      if (owner !== 'Unassigned' && existing.primaryOwner !== owner) {
        changes.push(`owner: ${existing.primaryOwner} → ${owner}`);
        updates.primaryOwner = owner;
        updates.salesPOCs = [owner];
      }

      // Close date change
      const existingClose = existing.expectedCloseDate ? new Date(existing.expectedCloseDate).toISOString().slice(0, 10) : '';
      const newClose = closeDate.toISOString().slice(0, 10);
      if (existingClose !== newClose) {
        changes.push(`closeDate: ${existingClose} → ${newClose}`);
        updates.expectedCloseDate = closeDate;
      }

      // Next step
      if (nextStep && existing.nextStep !== nextStep) {
        changes.push(`nextStep updated`);
        updates.nextStep = nextStep;
      }

      // Forecast category
      if (forecastCat && existing.forecastCategory !== forecastCat) {
        changes.push(`forecast: ${existing.forecastCategory || 'none'} → ${forecastCat}`);
        updates.forecastCategory = forecastCat;
      }

      // Lifecycle phase
      const phase = stage === 'Won' ? 'delivery' : stage === 'Negotiation' ? 'deal' : stage === 'Proposal' ? 'deal' : 'opportunity';
      if (existing.lifecyclePhase !== phase) {
        updates.lifecyclePhase = phase;
      }

      // Engagement type
      if (engagementType && existing.engagementType !== engagementType) {
        changes.push(`engagementType: ${existing.engagementType || 'none'} → ${engagementType}`);
        updates.engagementType = engagementType;
      }

      // Update metadata with latest Salesforce data
      updates.metadata = {
        ...(existing.metadata || {}),
        sfStage: sfStage,
        sfType: type,
        headcount,
        billRate,
        totalHourly,
        country,
        lastStageChange,
        annualRevenue: annualRev,
        lifetimeRevenue: lifetimeRev,
        fteQuantity: fteQty,
        fteFee,
        lastSyncedAt: new Date().toISOString(),
      };

      // Update description into conversation log if significantly different
      if (description && existing.conversationLog && !existing.conversationLog.includes(description.slice(0, 80))) {
        updates.conversationLog = `DESCRIPTION (updated):\n${description.slice(0, 2000)}\n\nNEXT STEP:\n${nextStep}\n\n---\n${existing.conversationLog}`;
        changes.push('conversationLog updated');
      }

      if (changes.length > 0) {
        updates.lastActivityDate = new Date();
        await Opportunity.updateOne({ _id: existing._id }, { $set: updates });
        updated.push({ name: `${accountName} — ${oppName}`, changes });
      } else {
        // Still update metadata silently
        await Opportunity.updateOne({ _id: existing._id }, { $set: { metadata: updates.metadata } });
        skipped.push(`${accountName} — ${oppName} (no changes)`);
      }
    } else {
      // ── INSERT new opportunity ──
      const oppCount = rows.filter(r => r['Account Name'] === accountName).length;
      let classification = 'NN';
      if (oppCount > 1) classification = 'EN';
      if (stage === 'Won' && oppCount > 2) classification = 'EE';

      const id = `SF-2026-${String(nextId++).padStart(4, '0')}`;

      let conversationLog = '';
      if (description) conversationLog += `DESCRIPTION:\n${description.slice(0, 3000)}\n\n`;
      if (nextStep) conversationLog += `NEXT STEP:\n${nextStep}\n\n`;

      // Find or create account
      let accountId: any = null;
      const acctLookup = accountMap.get(accountName.toLowerCase());
      if (acctLookup) {
        accountId = acctLookup._id;
      } else {
        try {
          const newAcct = await Account.create({
            companyName: accountName,
            industry: 'Technology',
            hqLocation: country,
            description: `Imported from Salesforce CSV`,
          });
          accountId = newAcct._id;
          accountMap.set(accountName.toLowerCase(), newAcct);
          newAccounts.push(accountName);
        } catch (e: any) {
          if (e.code === 11000) {
            const found = await Account.findOne({ companyName: accountName });
            if (found) accountId = found._id;
          }
        }
      }

      try {
        await Opportunity.create({
          id,
          customerName: accountName,
          opportunityName: oppName,
          status: stage,
          tcv,
          dealDuration: duration ? `${Math.round(parseFloat(duration))} months` : (headcount > 0 ? '12 months' : '6 months'),
          expectedCloseDate: closeDate,
          startDate: createdDate,
          primaryOwner: owner,
          salesPOCs: [owner],
          presalesPOCs: [],
          conversationLog: conversationLog.slice(0, 5000),
          industry: 'Technology',
          region,
          source: 'Salesforce Import',
          serviceLine,
          engagementType,
          engagementTypes: [engagementType],
          margin: 28,
          customTags: [type.replace('Galent - ', ''), classification],
          activityLog: [{ timestamp: new Date(), action: 'Imported from Salesforce CSV', user: 'system' }],
          metadata: {
            sfStage,
            sfType: type,
            headcount,
            billRate,
            totalHourly,
            country,
            lastStageChange,
            annualRevenue: annualRev,
            lifetimeRevenue: lifetimeRev,
            fteQuantity: fteQty,
            fteFee,
            importedAt: new Date().toISOString(),
          },
          lifecyclePhase: stage === 'Won' ? 'delivery' : stage === 'Negotiation' ? 'deal' : stage === 'Proposal' ? 'deal' : 'opportunity',
          forecastCategory: forecastCat,
          nextStep,
          accountId,
        });
        inserted.push(`${accountName} — ${oppName} [${stage}, $${tcv.toLocaleString()}]`);
      } catch (e: any) {
        if (e.code === 11000) {
          skipped.push(`${accountName} — ${oppName} (duplicate ID)`);
        } else {
          errors.push(`${accountName} — ${oppName}: ${e.message}`);
        }
      }
    }
  }

  // ── Report ──
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  SYNC REPORT                                 ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  console.log(`📥 INSERTED (${inserted.length} new opportunities):`);
  inserted.forEach(n => console.log(`   + ${n}`));

  console.log(`\n📝 UPDATED (${updated.length} opportunities with changes):`);
  updated.forEach(u => {
    console.log(`   ~ ${u.name}`);
    u.changes.forEach(c => console.log(`     └─ ${c}`));
  });

  if (newAccounts.length > 0) {
    console.log(`\n🏢 NEW ACCOUNTS (${newAccounts.length}):`);
    newAccounts.forEach(a => console.log(`   + ${a}`));
  }

  if (skipped.length > 0) {
    console.log(`\n⏭  SKIPPED (${skipped.length} — no changes):`);
    skipped.slice(0, 10).forEach(n => console.log(`   - ${n}`));
    if (skipped.length > 10) console.log(`   ... and ${skipped.length - 10} more`);
  }

  if (errors.length > 0) {
    console.log(`\n❌ ERRORS (${errors.length}):`);
    errors.forEach(e => console.log(`   ! ${e}`));
  }

  // Final counts
  const totalOpps = await Opportunity.countDocuments();
  const totalAccounts = await Account.countDocuments();
  console.log(`\n════════════════════════════════════════════════`);
  console.log(`Total opportunities: ${totalOpps}`);
  console.log(`Total accounts: ${totalAccounts}`);
  console.log(`════════════════════════════════════════════════\n`);

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
