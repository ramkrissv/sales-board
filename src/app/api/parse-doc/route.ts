/**
 * Document Parser API — extracts text from PPTX, DOCX, PDF, TXT files.
 * Uses python-pptx for PPTX, and basic text extraction for others.
 * Returns structured text content for AI processing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const TMP_DIR = '/tmp/salespilot-parse';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const buffer = Buffer.from(await file.arrayBuffer());

    // Ensure tmp dir exists
    if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true });
    const tmpPath = join(TMP_DIR, `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
    writeFileSync(tmpPath, buffer);

    let extractedText = '';
    let slides: { slideNumber: number; title: string; content: string }[] = [];

    try {
      if (ext === 'pptx' || ext === 'ppt') {
        // Parse PPTX with python-pptx
        const pythonScript = `
import json, sys
from pptx import Presentation

prs = Presentation("${tmpPath}")
slides = []
for i, slide in enumerate(prs.slides):
    texts = []
    title = ''
    for shape in slide.shapes:
        if hasattr(shape, 'text') and shape.text.strip():
            text = shape.text.strip()
            if not title and len(text) < 100:
                title = text
            texts.append(text)
    if texts:
        slides.append({"slideNumber": i+1, "title": title, "content": "\\n".join(texts)})

print(json.dumps(slides))
`;
        const result = execSync(`python3 -c '${pythonScript.replace(/'/g, "'\\''")}'`, {
          timeout: 30000,
          encoding: 'utf-8',
        });
        slides = JSON.parse(result.trim());
        extractedText = slides.map(s => `[Slide ${s.slideNumber}: ${s.title}]\n${s.content}`).join('\n\n');

      } else if (ext === 'docx' || ext === 'doc') {
        // Parse DOCX — try python-docx, fallback to strings
        try {
          const pythonScript = `
import json
from docx import Document
doc = Document("${tmpPath}")
paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
print(json.dumps({"text": "\\n".join(paragraphs)}))
`;
          const result = execSync(`python3 -c '${pythonScript.replace(/'/g, "'\\''")}'`, {
            timeout: 30000,
            encoding: 'utf-8',
          });
          extractedText = JSON.parse(result.trim()).text;
        } catch {
          // Fallback: extract readable strings from binary
          extractedText = buffer.toString('utf-8').replace(/[^\x20-\x7E\n]/g, ' ').replace(/\s{3,}/g, '\n').slice(0, 5000);
        }

      } else if (ext === 'pdf') {
        // PDF — try pdftotext, fallback to strings extraction
        try {
          extractedText = execSync(`pdftotext "${tmpPath}" -`, { timeout: 30000, encoding: 'utf-8' }).slice(0, 5000);
        } catch {
          extractedText = buffer.toString('utf-8').replace(/[^\x20-\x7E\n]/g, ' ').replace(/\s{3,}/g, '\n').slice(0, 5000);
        }

      } else {
        // Text files — read directly
        extractedText = buffer.toString('utf-8').slice(0, 5000);
      }
    } finally {
      // Cleanup
      try { unlinkSync(tmpPath); } catch {}
    }

    // Auto-index document for RAG search
    const entityType = (formData.get('entityType') as string) || 'workshop';
    const entityId = (formData.get('entityId') as string) || '';
    let chunksIndexed = 0;
    if (extractedText.length > 50 && entityId) {
      try {
        const { indexDocument } = await import('@/lib/rag/embeddings');
        chunksIndexed = await indexDocument({
          documentId: `${file.name}-${Date.now().toString(36)}`,
          documentName: file.name,
          text: extractedText,
          entityType: entityType as 'workshop' | 'opportunity' | 'account',
          entityId,
        });
      } catch (e) { console.error('RAG indexing error:', e); }
    }

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileType: ext,
      slides: slides.length > 0 ? slides : undefined,
      text: extractedText.slice(0, 10000),
      slideCount: slides.length,
      chunksIndexed,
    });
  } catch (error: any) {
    console.error('Parse error:', error);
    return NextResponse.json({ error: error.message || 'Parse failed' }, { status: 500 });
  }
}
