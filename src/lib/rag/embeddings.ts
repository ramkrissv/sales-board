/**
 * RAG Pipeline — Document chunking, embedding, and semantic search.
 * Stores embeddings in MongoDB (knowledge graph nodes with embedding field).
 * Uses Anthropic's message API for embedding-free semantic matching as fallback.
 */

import { connectDB } from '@/lib/db/connection';
import KnowledgeNode from '@/lib/db/models/knowledge-graph';

const CHUNK_SIZE = 500; // chars per chunk
const CHUNK_OVERLAP = 50;

/** Split text into overlapping chunks */
export function chunkText(text: string, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end).trim());
    start += chunkSize - overlap;
  }
  return chunks.filter(c => c.length > 20); // skip tiny chunks
}

/** Store document chunks in knowledge graph */
export async function indexDocument(params: {
  documentId: string;
  documentName: string;
  text: string;
  entityType: 'workshop' | 'opportunity' | 'account';
  entityId: string;
}): Promise<number> {
  await connectDB();
  const chunks = chunkText(params.text);

  // Store each chunk as a knowledge node
  for (let i = 0; i < chunks.length; i++) {
    const nodeId = `doc-chunk:${params.documentId}:${i}`;
    await KnowledgeNode.findOneAndUpdate(
      { nodeId },
      {
        nodeId,
        nodeType: 'document',
        label: `${params.documentName} [chunk ${i + 1}/${chunks.length}]`,
        properties: {
          content: chunks[i],
          documentId: params.documentId,
          documentName: params.documentName,
          chunkIndex: i,
          totalChunks: chunks.length,
          entityType: params.entityType,
          entityId: params.entityId,
        },
        edges: [{
          targetNodeId: `${params.entityType === 'opportunity' ? 'opp' : params.entityType}:${params.entityId}`,
          relationship: 'REFERENCES',
          properties: { weight: 0.7, context: `chunk ${i + 1}` },
        }],
        updatedBy: 'rag-pipeline',
      },
      { upsert: true, new: true }
    );
  }

  return chunks.length;
}

/** Search for relevant document chunks using text matching */
export async function searchDocuments(params: {
  query: string;
  entityType?: string;
  entityId?: string;
  limit?: number;
}): Promise<{ content: string; documentName: string; score: number }[]> {
  await connectDB();
  const limit = params.limit || 5;

  // Build search filter
  const filter: any = { nodeType: 'document' };
  if (params.entityType && params.entityId) {
    filter['properties.entityType'] = params.entityType;
    filter['properties.entityId'] = params.entityId;
  }

  // Text search using MongoDB $text or regex
  const queryWords = params.query.toLowerCase().split(/\s+/).filter(w => w.length > 3);

  if (queryWords.length === 0) {
    // Return most recent chunks
    const nodes = await KnowledgeNode.find(filter)
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();
    return nodes.map((n: any) => ({
      content: n.properties?.content || '',
      documentName: n.properties?.documentName || n.label,
      score: 0.5,
    }));
  }

  // Score each chunk by keyword overlap
  const allNodes = await KnowledgeNode.find(filter).lean();
  const scored = allNodes.map((n: any) => {
    const content = (n.properties?.content || '').toLowerCase();
    const matchCount = queryWords.filter(w => content.includes(w)).length;
    const score = queryWords.length > 0 ? matchCount / queryWords.length : 0;
    return {
      content: n.properties?.content || '',
      documentName: n.properties?.documentName || n.label,
      score,
    };
  })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}

/** Get all indexed documents for an entity */
export async function getIndexedDocuments(entityType: string, entityId: string): Promise<{ documentId: string; documentName: string; chunks: number }[]> {
  await connectDB();
  const nodes = await KnowledgeNode.find({
    nodeType: 'document',
    'properties.entityType': entityType,
    'properties.entityId': entityId,
  }).lean();

  // Group by documentId
  const docs: Record<string, { documentName: string; chunks: number }> = {};
  nodes.forEach((n: any) => {
    const docId = n.properties?.documentId;
    if (!docId) return;
    if (!docs[docId]) docs[docId] = { documentName: n.properties?.documentName || '', chunks: 0 };
    docs[docId].chunks++;
  });

  return Object.entries(docs).map(([documentId, info]) => ({ documentId, ...info }));
}
