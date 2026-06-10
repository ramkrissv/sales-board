import mongoose from 'mongoose';
import EngagementType from './models/engagement-type';

export const engagementTypesData = [
  { name: 'Time & Material', code: 'T&M', category: 'services' as const, pricingModels: ['Hourly Rate', 'Daily Rate', 'Monthly Rate'], description: 'Pay for actual hours/effort spent' },
  { name: 'Fixed Price', code: 'FP', category: 'services' as const, pricingModels: ['Milestone-based', 'Lump Sum'], description: 'Agreed fixed price for defined scope' },
  { name: 'Fixed Bid', code: 'FB', category: 'services' as const, pricingModels: ['Competitive Bid', 'Sealed Bid'], description: 'Competitive bid for defined requirements' },
  { name: 'Outcome Based', code: 'OB', category: 'services' as const, pricingModels: ['Success Fee', 'Gain Share', 'SLA-linked'], description: 'Payment tied to business outcomes' },
  { name: 'Hybrid', code: 'HYB', category: 'hybrid' as const, pricingModels: ['Base + Variable', 'Fixed + T&M', 'Retainer + Outcome'], description: 'Combination of pricing models' },
  { name: 'Managed Services - Fixed', code: 'MS-F', category: 'services' as const, pricingModels: ['Monthly Fixed', 'Annual Contract'], description: 'Managed services with fixed pricing' },
  { name: 'Managed Services - Outcome', code: 'MS-O', category: 'services' as const, pricingModels: ['SLA-based', 'KPI-linked'], description: 'Managed services tied to outcomes' },
  { name: 'Staffing', code: 'STF', category: 'staffing' as const, pricingModels: ['Bill Rate', 'Markup %'], description: 'Staff augmentation' },
  { name: 'Product Licensing', code: 'PL', category: 'product' as const, pricingModels: ['Per User', 'Per Seat', 'Enterprise License'], description: 'Software/product licensing' },
  { name: 'Product + Blended Services', code: 'PBS', category: 'hybrid' as const, pricingModels: ['License + Implementation', 'Platform + Support'], description: 'Product with implementation services' },
  { name: 'POC', code: 'POC', category: 'services' as const, pricingModels: ['Fixed POC Fee', 'Free Trial', 'Discounted'], description: 'Proof of Concept engagement' },
  { name: 'POC to Pod', code: 'P2P', category: 'hybrid' as const, pricingModels: ['POC Fee + Pod Rate'], description: 'POC that converts to dedicated pod' },
  { name: 'Pod Based', code: 'POD', category: 'services' as const, pricingModels: ['Monthly Pod Rate', 'Quarterly'], description: 'Dedicated team pod' },
  { name: 'Pod Based - T&M', code: 'POD-TM', category: 'services' as const, pricingModels: ['Pod Hourly', 'Pod Daily'], description: 'Pod with time & material billing' },
  { name: 'Pod Based - Outcome', code: 'POD-OB', category: 'services' as const, pricingModels: ['Pod + KPI Bonus', 'Pod + Success Fee'], description: 'Pod with outcome-based incentives' },
  { name: 'Pod Based - Fixed Price', code: 'POD-FP', category: 'services' as const, pricingModels: ['Fixed Sprint', 'Fixed Deliverable'], description: 'Pod with fixed price per sprint/deliverable' },
  { name: 'Retainer', code: 'RET', category: 'services' as const, pricingModels: ['Monthly Retainer', 'Quarterly Retainer'], description: 'Ongoing retainer relationship' },
];

export async function seedEngagementTypes() {
  console.log('[seed] Seeding engagement types...');
  for (const et of engagementTypesData) {
    await EngagementType.findOneAndUpdate(
      { code: et.code },
      { $setOnInsert: et },
      { upsert: true, new: true }
    );
  }
  console.log(`[seed] ${engagementTypesData.length} engagement types upserted.`);
}

// Allow running standalone: npx ts-node src/lib/db/seed-engagement-types.ts
if (require.main === module) {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/salespilot';
  mongoose.connect(MONGODB_URI).then(async () => {
    await seedEngagementTypes();
    await mongoose.disconnect();
    console.log('[seed] Done.');
  }).catch((err) => {
    console.error('[seed] Error:', err);
    process.exit(1);
  });
}
