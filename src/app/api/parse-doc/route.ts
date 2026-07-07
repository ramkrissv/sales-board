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
        // Parse PPTX with python-pptx — extract full slide structure
        const pythonScript = `
import json, sys
from pptx import Presentation

SKIP_HEADERS = ['galent', 'enterprise ai workshop']
FORMAT_TAGS = ['WHITEBOARD', 'STICKIES', 'PRESENT', 'DISCUSS', 'DOC INPUT', 'READOUT', 'PRIORITIZE', 'ALIGN', 'BUILD', 'SCORE']

prs = Presentation("${tmpPath}")
slides = []
for i, slide in enumerate(prs.slides):
    all_texts = []
    for shape in slide.shapes:
        if hasattr(shape, 'text') and shape.text.strip():
            all_texts.append(shape.text.strip())

    # Skip empty slides
    if not all_texts:
        continue

    # Filter out repeated headers
    meaningful = [t for t in all_texts if not any(h in t.lower() for h in SKIP_HEADERS)]

    # Extract title (first meaningful text that's short)
    title = ''
    subtitle = ''
    formats = []
    content_blocks = []
    slide_number = ''

    for t in meaningful:
        # Detect format tags
        if t.upper() in FORMAT_TAGS:
            formats.append(t.upper())
            continue
        # Detect slide numbers (2-digit at end)
        if len(t) <= 3 and t.isdigit():
            slide_number = t
            continue
        # Detect footer-like text
        if t.startswith('GALENT') or t.startswith('SESSION FORMAT'):
            continue
        # First substantial text is title
        if not title and len(t) < 120:
            title = t
        elif not subtitle and len(t) < 120 and len(content_blocks) == 0:
            subtitle = t
        else:
            content_blocks.append(t)

    # Separate content into cards (heading+body pairs) and KPIs (number+label)
    cards = []
    kpis = []
    misc = []
    j = 0
    while j < len(content_blocks):
        block = content_blocks[j]
        # KPI: short number followed by a label
        if len(block) <= 5 and any(c.isdigit() for c in block) and j + 1 < len(content_blocks) and len(content_blocks[j+1]) < 40:
            kpis.append({"value": block, "label": content_blocks[j+1]})
            j += 2
            continue
        # Card: short heading followed by longer body
        if len(block) < 50 and j + 1 < len(content_blocks) and len(content_blocks[j+1]) > 40:
            cards.append({"heading": block, "body": content_blocks[j+1]})
            j += 2
            continue
        # Long block is a standalone paragraph
        if len(block) > 60:
            cards.append({"heading": "", "body": block})
        else:
            misc.append(block)
        j += 1

    slides.append({
        "slideNumber": i + 1,
        "title": title or f"Slide {i+1}",
        "subtitle": subtitle,
        "formats": formats,
        "cards": cards,
        "kpis": kpis,
        "misc": misc,
        "contentBlocks": content_blocks,
        "content": "\\n\\n".join([title, subtitle] + content_blocks),
        "slideLabel": slide_number or str(i+1).zfill(2),
        "sectionName": ""
    })

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
