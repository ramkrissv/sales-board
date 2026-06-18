import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import mongoose from 'mongoose';
import { router, protectedProcedure } from '../trpc';
import { connectDB } from '@/lib/db/connection';
import { parseAIJson } from '@/lib/ai/parse-json';
import { Account } from '@/lib/db/models/account';
import { Opportunity } from '@/lib/db/models/opportunity';

const createAccountSchema = z.object({
  companyName: z.string(),
  website: z.string().optional(),
  industry: z.string().optional(),
  employeeCount: z.number().optional(),
  annualRevenue: z.number().optional(),
  hqLocation: z.string().optional(),
  techStack: z.array(z.string()).default([]),
  description: z.string().optional(),
  accountType: z.enum(['Strategic', 'Enterprise', 'Mid-Market', 'SMB']).optional(),
  accountHealth: z.number().min(0).max(100).optional(),
  penetration: z.number().min(0).max(100).optional(),
});

const updateAccountSchema = z.object({
  id: z.string(),
  companyName: z.string().optional(),
  website: z.string().optional(),
  industry: z.string().optional(),
  employeeCount: z.number().optional(),
  annualRevenue: z.number().optional(),
  hqLocation: z.string().optional(),
  techStack: z.array(z.string()).optional(),
  description: z.string().optional(),
  accountType: z.enum(['Strategic', 'Enterprise', 'Mid-Market', 'SMB']).optional(),
  accountHealth: z.number().min(0).max(100).optional(),
  penetration: z.number().min(0).max(100).optional(),
});

export const accountRouter = router({
  list: protectedProcedure.query(async () => {
    await connectDB();
    const accounts = await Account.find().sort({ createdAt: -1 }).lean();
    return accounts;
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      await connectDB();
      const account = await Account.findById(input.id).lean();

      if (!account) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Account not found',
        });
      }

      // Get associated opportunities
      // Match by accountId OR by customerName (case-insensitive partial match for name variations)
      const companyName = (account as any).companyName || '';
      const escapedName = companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const opportunities = await Opportunity.find({
        $or: [
          { accountId: input.id },
          { customerName: companyName },
          { customerName: { $regex: new RegExp(escapedName, 'i') } },
          // Also match if opportunity name contains account name
          { opportunityName: { $regex: new RegExp(escapedName, 'i') } },
        ],
      }).lean();

      return {
        ...account,
        opportunities,
      };
    }),

  create: protectedProcedure
    .input(createAccountSchema)
    .mutation(async ({ input }) => {
      await connectDB();
      const account = await Account.create(input);
      return account.toObject();
    }),

  update: protectedProcedure
    .input(updateAccountSchema)
    .mutation(async ({ input }) => {
      await connectDB();
      const { id, ...updates } = input;

      const account = await Account.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true }
      ).lean();

      if (!account) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Account not found',
        });
      }

      return account;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await connectDB();
      const result = await Account.findByIdAndDelete(input.id);

      if (!result) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Account not found',
        });
      }

      return { success: true };
    }),

  scoreIntent: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await connectDB();
      const account = await Account.findById(input.id).lean();
      if (!account) throw new TRPCError({ code: 'NOT_FOUND' });

      // Get all opportunities for this account
      const OppModel = mongoose.models.Opportunity || Opportunity;
      const companyName = (account as any).companyName || '';
      const escapedName = companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const opps = await OppModel.find({
        $or: [
          { accountId: input.id },
          { customerName: companyName },
          { customerName: { $regex: new RegExp(escapedName, 'i') } },
        ]
      }).lean();

      const { getAnthropicClient } = await import('@/lib/ai/anthropic');
      const client = getAnthropicClient();

      const response = await client.messages.create({
        model: process.env.AI_DEFAULT_MODEL || 'claude-sonnet-4-6',
        max_tokens: 512,
        messages: [{ role: 'user', content: `Score this account's buying intent for an IT services company. Return ONLY JSON:
Account: ${(account as any).companyName}
Industry: ${(account as any).industry || 'Unknown'}
Type: ${(account as any).accountType || 'Unknown'}
Deals: ${opps.length} (${opps.map((o: any) => `${o.status}: $${(o.tcv||0).toLocaleString()}`).join(', ')})
Health: ${(account as any).accountHealth || 'N/A'}

{"intentScore": <0-100>, "buyingStage": "<awareness|consideration|evaluation|decision|closed>", "signals": [{"signal": "<what>", "strength": "<strong|moderate|weak>"}], "recommendation": "<one sentence>"}` }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      try {
        const result = parseAIJson(text);
        // Save score to account
        await Account.findByIdAndUpdate(input.id, {
          accountHealth: result.intentScore,
          $set: { 'intentData': result },
        });
        return result;
      } catch {
        return { intentScore: 50, buyingStage: 'consideration', signals: [], recommendation: text.slice(0, 200) };
      }
    }),
});
