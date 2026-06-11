/**
 * Enrichment Script: Extract intelligence from conversation logs
 *
 * Processes all opportunity conversation logs and meeting notes to:
 * 1. Extract and create stakeholders mentioned in notes
 * 2. Populate knowledge graph with relationships
 * 3. Enrich account records with deal history
 * 4. Create activity timeline from dated entries
 * 5. Extract key topics, technologies, and competitive intel
 *
 * Usage: MONGODB_URI=mongodb://localhost:27017/galent npx tsx scripts/enrich-from-conversations.ts
 */

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/galent';

// Patterns to extract people names and titles from meeting notes
const NAME_PATTERNS = [
  /(?:with|met|connect(?:ed)? with|spoke (?:to|with)|called|emailed|intro(?:duced)? (?:to)?)\s+([A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/g,
  /([A-Z][a-z]+ [A-Z][a-z]+)\s*(?:\(|,\s*|-\s*)(?:VP|CTO|CIO|CEO|CFO|Director|Head|Manager|Lead|Principal|Sr|Senior|Chief)/g,
  /(?:@|cc:|CC:)\s*([A-Z][a-z]+ [A-Z][a-z]+)/g,
];

// Known Galent team members (exclude from stakeholder extraction)
const GALENT_TEAM = new Set([
  'Ashwin Bharath', 'Gaurav Gautam', 'Chris Wascak', 'Sreeram Narashimhan',
  'Shankar', 'Rajesh', 'Mike Minton', 'Aviroop Mookherjee', 'Jina Priya',
  'Ram', 'Rehan', 'Vijay', 'Kartick', 'Josh', 'Bapu', 'Ruben',
]);

// Title extraction patterns
const TITLE_PATTERNS: [RegExp, string][] = [
  [/CTO|Chief Technology/i, 'CTO'],
  [/CIO|Chief Information/i, 'CIO'],
  [/CEO|Chief Executive/i, 'CEO'],
  [/CFO|Chief Financial/i, 'CFO'],
  [/VP|Vice President/i, 'VP'],
  [/SVP|Senior Vice/i, 'SVP'],
  [/Director/i, 'Director'],
  [/Head of/i, 'Head'],
  [/Manager/i, 'Manager'],
  [/Lead/i, 'Lead'],
  [/Architect/i, 'Architect'],
  [/Engineer/i, 'Engineer'],
];

// Technology/topic extraction
const TECH_PATTERNS = [
  'AI', 'ML', 'GenAI', 'LLM', 'NLP', 'Computer Vision',
  'Cloud', 'AWS', 'Azure', 'GCP', 'Kubernetes', 'Docker',
  'Java', 'Python', '.NET', 'React', 'Node.js', 'PHP',
  'Salesforce', 'ServiceNow', 'SAP', 'Oracle', 'Workday',
  'Legacy Modernization', 'Migration', 'Microservices',
  'DevOps', 'CI/CD', 'Terraform', 'Automation',
  'Data Lake', 'Data Engineering', 'ETL', 'Databricks',
  'Security', 'Zero Trust', 'IAM', 'SIEM',
  'ITSM', 'ITIL', 'RPA', 'IoT', 'Blockchain',
  'Mainframe', 'COBOL', 'ERP', 'CRM', 'HCM',
];

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);

  // Get models
  const OppSchema = new mongoose.Schema({}, { strict: false });
  const StakeholderSchema = new mongoose.Schema({
    opportunityId: String, name: String, title: String, email: String,
    phone: String, linkedInUrl: String, isPrimaryContact: Boolean,
    isDecisionMaker: Boolean, notes: String,
  }, { timestamps: true });
  const AccountSchema = new mongoose.Schema({}, { strict: false });
  const ActivitySchema = new mongoose.Schema({
    type: String, entityType: String, entityId: String, entityName: String,
    description: String, userName: String, metadata: mongoose.Schema.Types.Mixed,
  }, { timestamps: true });
  const GraphNodeSchema = new mongoose.Schema({
    nodeId: { type: String, unique: true }, nodeType: String, label: String,
    properties: mongoose.Schema.Types.Mixed,
    edges: [{ targetNodeId: String, relationship: String, properties: mongoose.Schema.Types.Mixed }],
    updatedBy: String,
  }, { timestamps: true });

  const Opportunity = mongoose.models.Opportunity || mongoose.model('Opportunity', OppSchema);
  const Stakeholder = mongoose.models.Stakeholder || mongoose.model('Stakeholder', StakeholderSchema);
  const Account = mongoose.models.Account || mongoose.model('Account', AccountSchema);
  const Activity = mongoose.models.Activity || mongoose.model('Activity', ActivitySchema);
  const KnowledgeNode = mongoose.models.KnowledgeNode || mongoose.model('KnowledgeNode', GraphNodeSchema);

  const opps = await Opportunity.find().lean();
  console.log(`Processing ${opps.length} opportunities...`);

  let stakeholdersCreated = 0;
  let graphNodesCreated = 0;
  let activitiesCreated = 0;
  let accountsEnriched = 0;

  for (const opp of opps) {
    const oppId = (opp as any).id || (opp as any)._id.toString();
    const customerName = (opp as any).customerName || 'Unknown';
    const log = (opp as any).conversationLog || '';
    const description = (opp as any).metadata?.description || '';
    const fullText = `${log}\n${description}`;

    if (fullText.length < 20) continue;

    // ── 1. Extract stakeholder names ──
    const extractedNames = new Set<string>();
    for (const pattern of NAME_PATTERNS) {
      const regex = new RegExp(pattern.source, pattern.flags);
      let match;
      while ((match = regex.exec(fullText)) !== null) {
        const name = match[1]?.trim();
        if (name && name.length > 4 && name.length < 40 && !GALENT_TEAM.has(name)) {
          extractedNames.add(name);
        }
      }
    }

    // Create stakeholders that don't exist yet
    for (const name of extractedNames) {
      const existing = await Stakeholder.findOne({ opportunityId: oppId, name });
      if (!existing) {
        // Try to extract title
        let title = 'Contact';
        const nameContext = fullText.substring(
          Math.max(0, fullText.indexOf(name) - 50),
          Math.min(fullText.length, fullText.indexOf(name) + name.length + 100)
        );
        for (const [pattern, titleStr] of TITLE_PATTERNS) {
          if (pattern.test(nameContext)) { title = titleStr; break; }
        }

        const isDM = /decision|DM|approve|sign|executive|C-suite|CTO|CIO|CEO|CFO|VP/i.test(nameContext);

        await Stakeholder.create({
          opportunityId: oppId,
          name,
          title,
          isPrimaryContact: false,
          isDecisionMaker: isDM,
          notes: `Extracted from meeting notes: "${nameContext.trim().slice(0, 200)}"`,
        });
        stakeholdersCreated++;
      }
    }

    // ── 2. Extract technologies mentioned ──
    const techsMentioned = TECH_PATTERNS.filter(tech =>
      new RegExp(`\\b${tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(fullText)
    );

    // ── 3. Populate knowledge graph ──
    const acctNodeId = `account:${customerName}`;
    const oppNodeId = `opp:${oppId}`;

    // Upsert account node
    await KnowledgeNode.findOneAndUpdate(
      { nodeId: acctNodeId },
      {
        nodeId: acctNodeId, nodeType: 'account', label: customerName,
        properties: {
          industry: (opp as any).industry,
          region: (opp as any).region,
          techStack: techsMentioned,
          dealCount: opps.filter((o: any) => o.customerName === customerName).length,
          totalTCV: opps.filter((o: any) => o.customerName === customerName).reduce((s: number, o: any) => s + (o.tcv || 0), 0),
        },
        updatedBy: 'enrichment-script',
      },
      { upsert: true }
    );

    // Upsert opportunity node
    await KnowledgeNode.findOneAndUpdate(
      { nodeId: oppNodeId },
      {
        nodeId: oppNodeId, nodeType: 'opportunity', label: (opp as any).opportunityName,
        properties: {
          stage: (opp as any).status, tcv: (opp as any).tcv,
          owner: (opp as any).primaryOwner, closeDate: (opp as any).expectedCloseDate,
          techStack: techsMentioned,
        },
        edges: [{ targetNodeId: acctNodeId, relationship: 'BELONGS_TO_ACCOUNT', properties: { weight: 1.0 } }],
        updatedBy: 'enrichment-script',
      },
      { upsert: true }
    );

    // Add edges from account to opportunity
    await KnowledgeNode.updateOne(
      { nodeId: acctNodeId },
      { $addToSet: { edges: { targetNodeId: oppNodeId, relationship: 'HAS_OPPORTUNITY', properties: { weight: 0.8 } } } }
    );

    // Add stakeholder nodes to graph
    const stakeholders = await Stakeholder.find({ opportunityId: oppId }).lean();
    for (const s of stakeholders) {
      const sNodeId = `person:${(s as any).name}`;
      await KnowledgeNode.findOneAndUpdate(
        { nodeId: sNodeId },
        {
          nodeId: sNodeId, nodeType: 'person', label: (s as any).name,
          properties: { title: (s as any).title, email: (s as any).email, isDM: (s as any).isDecisionMaker },
          updatedBy: 'enrichment-script',
        },
        { upsert: true }
      );

      // Edge: opportunity → stakeholder
      const rel = (s as any).isDecisionMaker ? 'DECIDES' : 'HAS_STAKEHOLDER';
      await KnowledgeNode.updateOne(
        { nodeId: oppNodeId },
        { $addToSet: { edges: { targetNodeId: sNodeId, relationship: rel, properties: { weight: (s as any).isDecisionMaker ? 1.0 : 0.6 } } } }
      );
      graphNodesCreated++;
    }

    // Add owner node
    const owner = (opp as any).primaryOwner;
    if (owner) {
      const ownerNodeId = `user:${owner}`;
      await KnowledgeNode.findOneAndUpdate(
        { nodeId: ownerNodeId },
        { nodeId: ownerNodeId, nodeType: 'user', label: owner, properties: { role: 'Sales Owner' }, updatedBy: 'enrichment-script' },
        { upsert: true }
      );
      await KnowledgeNode.updateOne(
        { nodeId: ownerNodeId },
        { $addToSet: { edges: { targetNodeId: oppNodeId, relationship: 'OWNS_OPPORTUNITY', properties: { weight: 0.9 } } } }
      );
    }

    // ── 4. Create activity timeline from dated entries ──
    const datePattern = /(\d{2}\/\d{2})\s*[-–]\s*(.+?)(?=\n\d{2}\/\d{2}|\n\n|$)/gs;
    let dateMatch;
    while ((dateMatch = datePattern.exec(fullText)) !== null) {
      const dateStr = dateMatch[1];
      const activity = dateMatch[2].trim().slice(0, 200);
      if (activity.length > 10) {
        await Activity.create({
          type: 'meeting_note', entityType: 'opportunity', entityId: oppId,
          entityName: customerName, description: activity,
          userName: owner || 'System', metadata: { date: dateStr, source: 'conversation_log' },
        });
        activitiesCreated++;
      }
    }

    // ── 5. Enrich account record ──
    const account = await Account.findOne({ companyName: customerName });
    if (account) {
      const accountOpps = opps.filter((o: any) => o.customerName === customerName);
      const totalTCV = accountOpps.reduce((s: number, o: any) => s + (o.tcv || 0), 0);
      const wonDeals = accountOpps.filter((o: any) => o.status === 'Won');

      await Account.updateOne(
        { _id: account._id },
        {
          $set: {
            techStack: techsMentioned.length > 0 ? techsMentioned : (account as any).techStack,
            description: `${accountOpps.length} opportunities ($${(totalTCV / 1000).toFixed(0)}k total). ${wonDeals.length} won. Technologies: ${techsMentioned.join(', ') || 'N/A'}.`,
            metadata: {
              dealCount: accountOpps.length,
              totalTCV,
              wonCount: wonDeals.length,
              activeCount: accountOpps.filter((o: any) => !['Won', 'Lost'].includes(o.status)).length,
              owners: [...new Set(accountOpps.map((o: any) => o.primaryOwner))],
              lastActivity: new Date(),
            },
          },
        }
      );
      accountsEnriched++;
    }
  }

  // Summary
  const totalGraphNodes = await KnowledgeNode.countDocuments();
  const totalStakeholders = await Stakeholder.countDocuments();
  const totalActivities = await Activity.countDocuments();

  console.log(`\n═══ Enrichment Complete ═══`);
  console.log(`Stakeholders created: ${stakeholdersCreated}`);
  console.log(`Graph nodes/edges: ${graphNodesCreated} (total nodes: ${totalGraphNodes})`);
  console.log(`Activities created: ${activitiesCreated}`);
  console.log(`Accounts enriched: ${accountsEnriched}`);
  console.log(`Total stakeholders: ${totalStakeholders}`);
  console.log(`Total activities: ${totalActivities}`);
  console.log(`Total graph nodes: ${totalGraphNodes}`);

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
