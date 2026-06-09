import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { GraphService } from '@/lib/graph/graph-service';

export const graphRouter = router({
  // Get a node and its direct neighbors
  getNode: protectedProcedure
    .input(z.object({ nodeId: z.string() }))
    .query(async ({ input }) => {
      return GraphService.getNodeWithNeighbors(input.nodeId);
    }),

  // Get subgraph (multi-hop traversal)
  getSubgraph: protectedProcedure
    .input(z.object({ nodeId: z.string(), maxDepth: z.number().min(1).max(4).default(2) }))
    .query(async ({ input }) => {
      return GraphService.getSubgraph(input.nodeId, input.maxDepth);
    }),

  // Get relationship map for Account 360 view
  getRelationshipMap: protectedProcedure
    .input(z.object({ accountNodeId: z.string() }))
    .query(async ({ input }) => {
      return GraphService.getRelationshipMap(input.accountNodeId);
    }),

  // Get account stakeholders
  getAccountStakeholders: protectedProcedure
    .input(z.object({ accountNodeId: z.string() }))
    .query(async ({ input }) => {
      return GraphService.getAccountStakeholders(input.accountNodeId);
    }),

  // Get competitors
  getCompetitors: protectedProcedure
    .input(z.object({ accountNodeId: z.string() }))
    .query(async ({ input }) => {
      return GraphService.getCompetitors(input.accountNodeId);
    }),

  // Find similar accounts
  getSimilarAccounts: protectedProcedure
    .input(z.object({ accountNodeId: z.string(), limit: z.number().default(5) }))
    .query(async ({ input }) => {
      return GraphService.findSimilarAccounts(input.accountNodeId, input.limit);
    }),

  // Manually add a relationship
  addEdge: protectedProcedure
    .input(z.object({
      fromNodeId: z.string(),
      toNodeId: z.string(),
      relationship: z.string(),
      weight: z.number().min(0).max(1).optional(),
      context: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await GraphService.addEdge(input.fromNodeId, input.toNodeId, input.relationship, {
        weight: input.weight,
        context: input.context,
      });
      return { success: true };
    }),

  // Remove a relationship
  removeEdge: protectedProcedure
    .input(z.object({
      fromNodeId: z.string(),
      toNodeId: z.string(),
      relationship: z.string(),
    }))
    .mutation(async ({ input }) => {
      await GraphService.removeEdge(input.fromNodeId, input.toNodeId, input.relationship);
      return { success: true };
    }),
});
