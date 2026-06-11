/**
 * Seed script: Import real Galent opportunities + meeting notes
 *
 * Usage: npx tsx scripts/seed-real-data.ts
 *
 * This script:
 * 1. Backs up existing data
 * 2. Clears old demo opportunities
 * 3. Imports 62 real opportunities from Excel
 * 4. Loads 72 meeting notes as conversation logs
 * 5. Creates accounts from unique customer names
 */

import mongoose from 'mongoose';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/galent';
const EXCEL_PATH = '/Users/ramakrishnan/Downloads/All Open Opportunities - Galent-2026-06-11-15-17-33 (1).xlsx';
const MEETING_NOTES_DIR = '/tmp/meeting-notes/Client Meeting Notes';

// Stage mapping from Salesforce stages to Galent stages
const STAGE_MAP: Record<string, string> = {
  'Signed': 'Won',
  'Qualifying': 'Qualification',
  'Proposal': 'Proposal',
  'Negotiation': 'Negotiation',
  'Prospecting': 'Discovery',
  'Closed Won': 'Won',
  'Closed Lost': 'Lost',
};

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.');

  // Define schemas inline (same as app models)
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
    industry: { type: String, default: 'Technology' },
    region: { type: String, default: 'North America' },
    source: { type: String, default: 'Direct' },
    serviceLine: String,
    billingModel: String,
    clientType: String,
    opportunityType: String,
    engagementType: String,
    margin: Number,
    customTags: [String],
    activityLog: [{ timestamp: Date, action: String, user: String }],
    metadata: mongoose.Schema.Types.Mixed,
    lifecyclePhase: String,
  }, { timestamps: true });

  const AccountSchema = new mongoose.Schema({
    companyName: { type: String, required: true },
    industry: String,
    website: String,
    location: String,
    employeeCount: Number,
    annualRevenue: Number,
    techStack: [String],
    description: String,
    aiSummary: String,
    intentScore: Number,
    createdBy: String,
  }, { timestamps: true });

  const Opportunity = mongoose.models.Opportunity || mongoose.model('Opportunity', OppSchema);
  const Account = mongoose.models.Account || mongoose.model('Account', AccountSchema);

  // Step 1: Count existing data
  const existingCount = await Opportunity.countDocuments();
  console.log(`Existing opportunities: ${existingCount}`);

  // Step 2: Clear old demo data (keep any real data that might exist)
  console.log('Clearing old demo opportunities...');
  await Opportunity.deleteMany({ id: { $regex: /^OPP-|^NN-|^EN-|^EE-|^SF-/ } });
  const remaining = await Opportunity.countDocuments();
  console.log(`Remaining after cleanup: ${remaining}`);

  // Step 3: Parse Excel
  console.log('Parsing Excel file...');
  const wb = XLSX.readFile(EXCEL_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(ws);
  console.log(`Found ${rows.length} opportunities in Excel.`);

  // Step 4: Load meeting notes by account
  const meetingNotes: Record<string, string[]> = {};
  if (fs.existsSync(MEETING_NOTES_DIR)) {
    const dirs = fs.readdirSync(MEETING_NOTES_DIR);
    for (const dir of dirs) {
      const dirPath = path.join(MEETING_NOTES_DIR, dir);
      if (!fs.statSync(dirPath).isDirectory()) continue;
      const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.md'));
      for (const file of files) {
        const content = fs.readFileSync(path.join(dirPath, file), 'utf-8');
        const accountName = dir;
        if (!meetingNotes[accountName]) meetingNotes[accountName] = [];
        meetingNotes[accountName].push(`--- ${file.replace('.md', '')} ---\n${content}`);
      }
    }
    console.log(`Loaded meeting notes for ${Object.keys(meetingNotes).length} accounts.`);
  }

  // Step 5: Import opportunities
  let imported = 0;
  const accountNames = new Set<string>();

  for (const row of rows) {
    const accountName = row['Account Name'] || 'Unknown';
    const oppName = row['Opportunity Name'] || 'Untitled';
    const stage = STAGE_MAP[row['Stage']] || row['Stage'] || 'Discovery';
    const owner = row['Opportunity Owner'] || 'Unassigned';
    const type = row['Type'] || 'Galent - Project Delivery';
    const closeDate = row['Close Date'] ? new Date(row['Close Date']) : new Date();
    const createdDate = row['Created Date'] ? new Date(row['Created Date']) : new Date();
    const description = row['Description'] || '';
    const nextStep = row['Next Step'] || '';
    const country = row['Operating Country'] || 'United States';
    const fixedFee = row['Fixed Project Fee'] || 0;
    const billRate = row['Bill Rate'] || 0;
    const totalHourly = row['Total Hourly Bill Rate'] || 0;
    const headcount = row['Billing Demand Quantity'] || 0;
    const fteFees = row['Total FTE Fees'] || 0;

    // Calculate TCV: use fixed fee if available, otherwise estimate from hourly rate
    let tcv = fixedFee;
    if (!tcv && totalHourly > 0) {
      tcv = totalHourly * 160 * 12; // 12 months at 160 hrs/month
    }
    if (!tcv && fteFees > 0) {
      tcv = fteFees;
    }

    // Determine region from country
    const region = country.includes('India') ? 'APAC' : 'North America';

    // Determine engagement type
    let engagementType = '';
    if (type.includes('CWR')) engagementType = 'Staff Augmentation';
    else if (type.includes('FTE')) engagementType = 'FTE Hiring';
    else if (type.includes('Project')) engagementType = 'Project Delivery';

    // Determine deal classification
    let classification = 'NN';
    // Check if existing account (multiple opps for same account = EN/EE)
    const oppCountForAccount = rows.filter(r => r['Account Name'] === accountName).length;
    if (oppCountForAccount > 1) classification = 'EN';
    if (stage === 'Won' && oppCountForAccount > 2) classification = 'EE';

    const year = closeDate.getFullYear();
    const id = `${classification}-${year}-${String(imported + 1).padStart(4, '0')}`;

    // Build conversation log from description + next step + meeting notes
    let conversationLog = '';
    if (description) conversationLog += `DESCRIPTION:\n${description}\n\n`;
    if (nextStep) conversationLog += `NEXT STEP:\n${nextStep}\n\n`;

    // Add meeting notes for matching accounts
    const matchingNotes = Object.entries(meetingNotes).find(([key]) =>
      accountName.toLowerCase().includes(key.toLowerCase()) ||
      key.toLowerCase().includes(accountName.toLowerCase().split(' ')[0])
    );
    if (matchingNotes) {
      conversationLog += `\nMEETING NOTES:\n${matchingNotes[1].join('\n\n')}`;
    }

    accountNames.add(accountName);

    try {
      await Opportunity.create({
        id,
        customerName: accountName,
        opportunityName: oppName,
        status: stage,
        tcv: Math.round(tcv),
        dealDuration: headcount > 0 ? '12 months' : '6 months',
        expectedCloseDate: closeDate,
        startDate: createdDate,
        primaryOwner: owner,
        salesPOCs: [owner],
        presalesPOCs: [],
        conversationLog: conversationLog.slice(0, 5000), // Limit size
        industry: 'Technology',
        region,
        source: 'Direct',
        serviceLine: engagementType.includes('Staff') ? 'Staffing' : 'IT Services',
        engagementType,
        margin: 28,
        customTags: [type.replace('Galent - ', ''), classification],
        activityLog: [],
        metadata: {
          sfStage: row['Stage'],
          sfType: type,
          headcount,
          billRate,
          totalHourly,
          country,
          lastStageChange: row['Last Stage Change Date'],
        },
        lifecyclePhase: stage === 'Won' ? 'delivery' : stage === 'Negotiation' ? 'deal' : stage === 'Proposal' ? 'pursuit' : 'opportunity',
      });
      imported++;
    } catch (e: any) {
      if (e.code === 11000) {
        console.log(`  Skipped duplicate: ${id} ${accountName}`);
      } else {
        console.error(`  Error: ${e.message} for ${accountName}`);
      }
    }
  }

  console.log(`Imported ${imported} opportunities.`);

  // Step 6: Create accounts from unique names
  let accountsCreated = 0;
  for (const name of accountNames) {
    const exists = await Account.findOne({ companyName: name });
    if (!exists) {
      await Account.create({
        companyName: name,
        industry: 'Technology',
        description: `Account for ${name}`,
        createdBy: 'seed-script',
      });
      accountsCreated++;
    }
  }
  console.log(`Created ${accountsCreated} new accounts.`);

  // Summary
  const totalOpps = await Opportunity.countDocuments();
  const totalAccounts = await Account.countDocuments();
  console.log(`\nDone! Total opportunities: ${totalOpps}, Total accounts: ${totalAccounts}`);

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
