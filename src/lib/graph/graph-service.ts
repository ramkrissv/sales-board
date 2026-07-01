import { connectDB } from '@/lib/db/connection';
import KnowledgeNode, { IKnowledgeNode } from '@/lib/db/models/knowledge-graph';

export class GraphService {
  /**
   * Add or update a node in the knowledge graph
   */
  static async upsertNode(
    nodeId: string,
    nodeType: IKnowledgeNode['nodeType'],
    label: string,
    properties: Record<string, any> = {},
    updatedBy = 'system'
  ) {
    await connectDB();
    return KnowledgeNode.findOneAndUpdate(
      { nodeId },
      { nodeId, nodeType, label, properties, updatedBy },
      { upsert: true, new: true }
    );
  }

  /**
   * Add an edge (relationship) between two nodes
   */
  static async addEdge(
    fromNodeId: string,
    toNodeId: string,
    relationship: string,
    properties: { weight?: number; context?: string } = {}
  ) {
    await connectDB();
    // Remove existing edge of same type if exists, then add new one
    await KnowledgeNode.updateOne(
      { nodeId: fromNodeId },
      { $pull: { edges: { targetNodeId: toNodeId, relationship } } }
    );
    return KnowledgeNode.updateOne(
      { nodeId: fromNodeId },
      {
        $push: {
          edges: {
            targetNodeId: toNodeId,
            relationship,
            properties: {
              weight: properties.weight || 0.5,
              since: new Date(),
              lastInteraction: new Date(),
              context: properties.context,
            },
          },
        },
      }
    );
  }

  /**
   * Remove an edge between two nodes
   */
  static async removeEdge(fromNodeId: string, toNodeId: string, relationship: string) {
    await connectDB();
    return KnowledgeNode.updateOne(
      { nodeId: fromNodeId },
      { $pull: { edges: { targetNodeId: toNodeId, relationship } } }
    );
  }

  /**
   * Get a node with all its direct connections (1-hop neighbors)
   */
  static async getNodeWithNeighbors(nodeId: string) {
    await connectDB();
    const node = await KnowledgeNode.findOne({ nodeId }).lean();
    if (!node) return null;

    const neighborIds = node.edges.map((e: any) => e.targetNodeId);
    const neighbors = await KnowledgeNode.find({ nodeId: { $in: neighborIds } }).lean();

    return { node, neighbors };
  }

  /**
   * Get all nodes connected to a given node within N hops (graph traversal)
   */
  static async getSubgraph(nodeId: string, maxDepth = 2) {
    await connectDB();
    const result = await KnowledgeNode.aggregate([
      { $match: { nodeId } },
      {
        $graphLookup: {
          from: 'knowledgenodes',
          startWith: '$edges.targetNodeId',
          connectFromField: 'edges.targetNodeId',
          connectToField: 'nodeId',
          as: 'connected',
          maxDepth: maxDepth - 1,
          depthField: 'depth',
        },
      },
    ]);
    return result[0] || null;
  }

  /**
   * Find all stakeholders for an account (2-hop: account -> opportunity -> person)
   */
  static async getAccountStakeholders(accountNodeId: string) {
    await connectDB();
    return KnowledgeNode.aggregate([
      { $match: { nodeId: accountNodeId } },
      {
        $graphLookup: {
          from: 'knowledgenodes',
          startWith: '$edges.targetNodeId',
          connectFromField: 'edges.targetNodeId',
          connectToField: 'nodeId',
          as: 'connected',
          maxDepth: 2,
        },
      },
      { $unwind: '$connected' },
      { $match: { 'connected.nodeType': 'person' } },
      { $replaceRoot: { newRoot: '$connected' } },
    ]);
  }

  /**
   * Find competitors for an account
   */
  static async getCompetitors(accountNodeId: string) {
    await connectDB();
    const node = await KnowledgeNode.findOne({ nodeId: accountNodeId }).lean();
    if (!node) return [];

    const competitorEdges = (node.edges as any[]).filter(
      (e: any) => e.relationship === 'COMPETES_WITH'
    );
    const competitorIds = competitorEdges.map((e: any) => e.targetNodeId);
    return KnowledgeNode.find({ nodeId: { $in: competitorIds } }).lean();
  }

  /**
   * Find similar accounts based on shared properties
   */
  static async findSimilarAccounts(accountNodeId: string, limit = 5) {
    await connectDB();
    const account = await KnowledgeNode.findOne({ nodeId: accountNodeId }).lean();
    if (!account) return [];

    return KnowledgeNode.find({
      nodeId: { $ne: accountNodeId },
      nodeType: 'account',
      $or: [
        { 'properties.industry': (account.properties as any)?.industry },
        { 'properties.region': (account.properties as any)?.region },
      ],
    })
      .limit(limit)
      .lean();
  }

  /**
   * Get relationship map for an account (for Account 360 Stakeholder Neural Map)
   */
  static async getRelationshipMap(accountNodeId: string) {
    await connectDB();
    // Get all people connected to this account's opportunities
    const subgraph = await KnowledgeNode.aggregate([
      { $match: { nodeId: accountNodeId } },
      {
        $graphLookup: {
          from: 'knowledgenodes',
          startWith: '$edges.targetNodeId',
          connectFromField: 'edges.targetNodeId',
          connectToField: 'nodeId',
          as: 'connected',
          maxDepth: 3,
        },
      },
    ]);

    if (subgraph[0]) {
      const root = subgraph[0];
      const allNodes = [root, ...root.connected];
      const nodes = allNodes.map((n: any) => ({ id: n.nodeId, type: n.nodeType, label: n.label, properties: n.properties }));
      const edges: { from: string; to: string; relationship: string; weight: number }[] = [];
      for (const n of allNodes) {
        for (const edge of (n.edges || [])) {
          if (allNodes.some((an: any) => an.nodeId === edge.targetNodeId)) {
            edges.push({ from: n.nodeId, to: edge.targetNodeId, relationship: edge.relationship, weight: edge.properties?.weight || 0.5 });
          }
        }
      }
      if (nodes.length > 0) return { nodes, edges };
    }

    // FALLBACK: Build graph from real opportunity + stakeholder data when knowledge graph is empty
    try {
      const mongoose = await import('mongoose');
      const Opportunity = mongoose.default.models.Opportunity;
      const Stakeholder = mongoose.default.models.Stakeholder;
      if (!Opportunity || !Stakeholder) return { nodes: [], edges: [] };

      // Find account by nodeId pattern (account:Name or just the name)
      const accountName = accountNodeId.replace(/^account:/, '');
      const opps = await Opportunity.find({
        $or: [
          { customerName: { $regex: new RegExp(accountName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } },
          { id: accountNodeId },
        ],
      }).lean();

      if (opps.length === 0) return { nodes: [], edges: [] };

      const nodes: any[] = [];
      const edges: { from: string; to: string; relationship: string; weight: number }[] = [];

      // Account node (center)
      const acctId = `account:${opps[0].customerName}`;
      nodes.push({ id: acctId, type: 'account', label: opps[0].customerName, properties: { industry: opps[0].industry, region: opps[0].region } });

      for (const opp of opps) {
        // Opportunity node
        const oppId = `opp:${opp.id || opp._id}`;
        nodes.push({ id: oppId, type: 'opportunity', label: opp.opportunityName, properties: { stage: opp.status, tcv: opp.tcv, owner: opp.primaryOwner } });
        edges.push({ from: acctId, to: oppId, relationship: 'HAS_OPPORTUNITY', weight: 0.8 });

        // Owner node
        if (opp.primaryOwner) {
          const ownerId = `user:${opp.primaryOwner}`;
          if (!nodes.find(n => n.id === ownerId)) {
            nodes.push({ id: ownerId, type: 'user', label: opp.primaryOwner, properties: { role: 'Owner' } });
          }
          edges.push({ from: ownerId, to: oppId, relationship: 'OWNS_OPPORTUNITY', weight: 0.9 });
        }

        // Stakeholder nodes
        const stakeholders = await Stakeholder.find({ opportunityId: opp.id || opp._id?.toString() }).lean();
        for (const s of stakeholders) {
          const sId = `person:${(s as any).name}`;
          if (!nodes.find(n => n.id === sId)) {
            nodes.push({ id: sId, type: 'person', label: (s as any).name, properties: { title: (s as any).title, email: (s as any).email, isDM: (s as any).isDecisionMaker } });
          }
          const rel = (s as any).isDecisionMaker ? 'DECIDES' : 'HAS_STAKEHOLDER';
          edges.push({ from: oppId, to: sId, relationship: rel, weight: (s as any).isDecisionMaker ? 1.0 : 0.6 });
        }
      }

      return { nodes, edges };
    } catch (e) {
      return { nodes: [], edges: [] };
    }
  }

  /**
   * Sync opportunity data into the knowledge graph
   * Called when an opportunity is created or updated
   */
  static async syncOpportunityToGraph(opportunity: any) {
    const oppNodeId = `opp:${opportunity.id || opportunity._id}`;

    // Upsert opportunity node
    await this.upsertNode(oppNodeId, 'opportunity', opportunity.opportunityName, {
      customerName: opportunity.customerName,
      status: opportunity.status,
      tcv: opportunity.tcv,
      stage: opportunity.status,
      industry: opportunity.industry,
      region: opportunity.region,
      serviceLine: opportunity.serviceLine,
    });

    // Link to account if we can find/create one
    const accountNodeId = `account:${opportunity.customerName.toLowerCase().replace(/\s+/g, '-')}`;
    await this.upsertNode(accountNodeId, 'account', opportunity.customerName, {
      industry: opportunity.industry,
      region: opportunity.region,
    });
    await this.addEdge(oppNodeId, accountNodeId, 'BELONGS_TO_ACCOUNT');
    await this.addEdge(accountNodeId, oppNodeId, 'HAS_STAKEHOLDER', { context: 'opportunity' });

    // Link owner
    if (opportunity.primaryOwner) {
      const ownerNodeId = `user:${opportunity.primaryOwner.toLowerCase().replace(/\s+/g, '-')}`;
      await this.upsertNode(ownerNodeId, 'user', opportunity.primaryOwner, {});
      await this.addEdge(ownerNodeId, oppNodeId, 'OWNS_OPPORTUNITY');
    }

    // Link service line
    if (opportunity.serviceLine) {
      const slNodeId = `sl:${opportunity.serviceLine.toLowerCase().replace(/\s+/g, '-')}`;
      await this.upsertNode(slNodeId, 'service_line', opportunity.serviceLine, {});
      await this.addEdge(oppNodeId, slNodeId, 'SOLD_SERVICE');
    }
  }

  /**
   * Sync a document into the knowledge graph — creates a document node linked to the entity
   */
  static async syncDocumentToGraph(doc: {
    name: string;
    content: string;
    entityType: 'opportunity' | 'workshop' | 'account';
    entityId: string;
    entityName: string;
  }) {
    const docNodeId = `doc:${doc.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString(36)}`;
    await this.upsertNode(docNodeId, 'document', doc.name, {
      content: doc.content.slice(0, 5000),
      contentLength: doc.content.length,
      entityType: doc.entityType,
      entityId: doc.entityId,
      uploadedAt: new Date().toISOString(),
    });

    // Link to the entity
    const entityNodeId = `${doc.entityType === 'opportunity' ? 'opp' : doc.entityType}:${doc.entityId}`;
    await this.addEdge(entityNodeId, docNodeId, 'HAS_DOCUMENT', { context: doc.name });

    return docNodeId;
  }

  /**
   * Sync workshop data into the knowledge graph
   */
  static async syncWorkshopToGraph(workshop: any) {
    const wsNodeId = `workshop:${workshop.id}`;
    const levels = workshop.framework?.levels || [];
    const allDims = levels.flatMap((l: any) => l.dimensions || []);
    const scored = allDims.filter((d: any) => d.currentScore != null);

    await this.upsertNode(wsNodeId, 'workshop', workshop.title, {
      customerName: workshop.customerName,
      status: workshop.status,
      readinessIndex: scored.length > 0 ? Math.round(scored.reduce((s: number, d: any) => s + d.currentScore, 0) / scored.length / 4 * 100) : 0,
      dimensionsScored: scored.length,
      totalDimensions: allDims.length,
      gapCount: allDims.filter((d: any) => d.currentScore != null && d.targetScore != null && d.targetScore > d.currentScore).length,
      useCaseCount: (workshop.useCases || []).length,
    });

    // Link to opportunity if exists
    if (workshop.opportunityId) {
      await this.addEdge(`opp:${workshop.opportunityId}`, wsNodeId, 'HAS_WORKSHOP');
    }

    // Link use cases
    for (const uc of (workshop.useCases || [])) {
      const ucNodeId = `use_case:${uc.id}`;
      await this.upsertNode(ucNodeId, 'use_case', uc.name, {
        value: uc.value, feasibility: uc.feasibility, isPilot: uc.isPilot,
        sponsor: uc.sponsor, problem: uc.problem,
      });
      await this.addEdge(wsNodeId, ucNodeId, 'HAS_USE_CASE');
    }

    return wsNodeId;
  }

  /**
   * Get all documents for an entity (for AI context)
   */
  static async getDocumentsForEntity(entityType: string, entityId: string): Promise<string[]> {
    await connectDB();
    const entityNodeId = `${entityType === 'opportunity' ? 'opp' : entityType}:${entityId}`;
    const node = await KnowledgeNode.findOne({ nodeId: entityNodeId }).lean();
    if (!node) return [];

    const docEdges = (node.edges as any[]).filter((e: any) => e.relationship === 'HAS_DOCUMENT');
    const docIds = docEdges.map((e: any) => e.targetNodeId);
    const docs = await KnowledgeNode.find({ nodeId: { $in: docIds } }).lean();
    return docs.map((d: any) => `[${d.label}]: ${(d.properties as any)?.content || ''}`);
  }

  /**
   * Sync stakeholder data into the knowledge graph
   */
  static async syncStakeholderToGraph(stakeholder: any, opportunityId: string) {
    const personNodeId = `person:${stakeholder.name.toLowerCase().replace(/\s+/g, '-')}`;
    const oppNodeId = `opp:${opportunityId}`;

    await this.upsertNode(personNodeId, 'person', stakeholder.name, {
      title: stakeholder.title,
      email: stakeholder.email,
      phone: stakeholder.phone,
      linkedInUrl: stakeholder.linkedInUrl,
      isPrimaryContact: stakeholder.isPrimaryContact,
      isDecisionMaker: stakeholder.isDecisionMaker,
    });

    // Determine relationship type
    if (stakeholder.isDecisionMaker) {
      await this.addEdge(personNodeId, oppNodeId, 'DECIDES', { weight: 0.9 });
    } else if (stakeholder.isPrimaryContact) {
      await this.addEdge(personNodeId, oppNodeId, 'CHAMPIONS', { weight: 0.8 });
    } else {
      await this.addEdge(personNodeId, oppNodeId, 'EVALUATES', { weight: 0.5 });
    }

    // Also link person to account
    // Find the account node for this opportunity
    const oppNode = await KnowledgeNode.findOne({ nodeId: oppNodeId }).lean();
    if (oppNode) {
      const accountEdge = (oppNode.edges as any[]).find(
        (e: any) => e.relationship === 'BELONGS_TO_ACCOUNT'
      );
      if (accountEdge) {
        await this.addEdge(accountEdge.targetNodeId, personNodeId, 'HAS_STAKEHOLDER', {
          context: stakeholder.title,
        });
      }
    }
  }
}
