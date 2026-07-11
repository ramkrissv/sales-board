/**
 * Cleanup duplicate opportunities
 *
 * Usage: npx tsx scripts/cleanup-duplicates.ts
 *
 * Finds opportunities with the same opportunityName,
 * keeps the most recently updated one, removes the rest.
 * Prints a report before and after.
 */

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/galent';

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.\n');

  const OppSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
  const Opportunity = mongoose.models.Opportunity || mongoose.model('Opportunity', OppSchema);

  const totalBefore = await Opportunity.countDocuments();
  console.log(`Total opportunities: ${totalBefore}\n`);

  // Find duplicates by opportunityName
  const dups = await Opportunity.aggregate([
    { $group: { _id: '$opportunityName', count: { $sum: 1 }, docs: { $push: { id: '$_id', updatedAt: '$updatedAt', oppId: '$id' } } } },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } },
  ]);

  if (dups.length === 0) {
    console.log('No duplicates found!');
    await mongoose.disconnect();
    return;
  }

  console.log(`Found ${dups.length} duplicate sets:\n`);
  let removed = 0;

  for (const dup of dups) {
    console.log(`  ${dup.count}x "${dup._id}"`);
    // Sort by updatedAt desc — keep the newest
    const sorted = dup.docs.sort((a: any, b: any) =>
      new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    );
    const keep = sorted[0];
    const remove = sorted.slice(1);

    console.log(`    KEEP: ${keep.oppId} (updated ${keep.updatedAt})`);
    for (const r of remove) {
      console.log(`    REMOVE: ${r.oppId} (updated ${r.updatedAt})`);
      await Opportunity.deleteOne({ _id: r.id });
      removed++;
    }
  }

  const totalAfter = await Opportunity.countDocuments();
  console.log(`\nRemoved ${removed} duplicates. ${totalBefore} → ${totalAfter} opportunities.`);

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
