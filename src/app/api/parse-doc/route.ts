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
        // Parse PPTX with python-pptx — extract FULL shape geometry, colors, fonts
        const pythonScript = `
import json, sys
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE_TYPE

def rgb_to_hex(rgb):
    if rgb is None:
        return None
    try:
        return '#{:02x}{:02x}{:02x}'.format(rgb[0], rgb[1], rgb[2])
    except:
        return None

def get_fill_color(shape):
    try:
        fill = shape.fill
        if fill.type is not None:
            if hasattr(fill, 'fore_color') and fill.fore_color and fill.fore_color.type is not None:
                try:
                    rgb = fill.fore_color.rgb
                    return '#{}'.format(str(rgb))
                except:
                    pass
    except:
        pass
    return None

def get_text_props(shape):
    """Extract text with per-run font info"""
    paragraphs = []
    if not shape.has_text_frame:
        return paragraphs
    for para in shape.text_frame.paragraphs:
        runs = []
        align = 'left'
        try:
            if para.alignment == PP_ALIGN.CENTER:
                align = 'center'
            elif para.alignment == PP_ALIGN.RIGHT:
                align = 'right'
        except:
            pass
        for run in para.runs:
            font = run.font
            color = None
            try:
                if font.color and font.color.rgb:
                    color = '#{}'.format(str(font.color.rgb))
            except:
                pass
            runs.append({
                'text': run.text,
                'bold': bool(font.bold),
                'italic': bool(font.italic),
                'size': round(font.size.pt, 1) if font.size else None,
                'color': color,
                'name': font.name,
            })
        if runs or para.text.strip():
            paragraphs.append({
                'text': para.text,
                'align': align,
                'runs': runs,
            })
    return paragraphs

SKIP_HEADERS = ['galent', 'enterprise ai workshop']
FORMAT_TAGS = ['WHITEBOARD', 'STICKIES', 'PRESENT', 'DISCUSS', 'DOC INPUT', 'READOUT', 'PRIORITIZE', 'ALIGN', 'BUILD', 'SCORE']

prs = Presentation("${tmpPath}")
slide_w = prs.slide_width.emu if prs.slide_width else 12192000
slide_h = prs.slide_height.emu if prs.slide_height else 6858000

slides = []
for i, slide in enumerate(prs.slides):
    # Extract background color
    bg_color = None
    try:
        bg = slide.background
        if bg.fill and bg.fill.type is not None:
            try:
                rgb = bg.fill.fore_color.rgb
                bg_color = '#{}'.format(str(rgb))
            except:
                pass
    except:
        pass

    shapes_data = []
    all_texts = []
    for shape in slide.shapes:
        text = shape.text.strip() if hasattr(shape, 'text') else ''
        if text:
            all_texts.append(text)

        # Get shape geometry as percentages of slide dimensions
        left_pct = round((shape.left / slide_w) * 100, 2) if shape.left is not None else 0
        top_pct = round((shape.top / slide_h) * 100, 2) if shape.top is not None else 0
        width_pct = round((shape.width / slide_w) * 100, 2) if shape.width is not None else 0
        height_pct = round((shape.height / slide_h) * 100, 2) if shape.height is not None else 0

        fill_color = get_fill_color(shape)
        paragraphs = get_text_props(shape) if shape.has_text_frame else []

        # Detect shape type
        shape_type = 'rect'
        try:
            if shape.shape_type == MSO_SHAPE_TYPE.AUTO_SHAPE:
                shape_type = 'auto'
            elif shape.shape_type == MSO_SHAPE_TYPE.TEXT_BOX:
                shape_type = 'text'
            elif shape.shape_type == MSO_SHAPE_TYPE.PICTURE:
                shape_type = 'image'
            elif shape.shape_type == MSO_SHAPE_TYPE.GROUP:
                shape_type = 'group'
            elif shape.shape_type == MSO_SHAPE_TYPE.TABLE:
                shape_type = 'table'
        except:
            pass

        # Get rotation
        rotation = 0
        try:
            rotation = shape.rotation
        except:
            pass

        # Border/line
        border_color = None
        border_width = 0
        try:
            ln = shape.line
            if ln.fill.type is not None:
                border_width = round(ln.width.pt, 1) if ln.width else 1
                try:
                    border_color = '#{}'.format(str(ln.color.rgb))
                except:
                    border_color = '#000000'
        except:
            pass

        # Corner radius (rounded rect)
        corner_radius = 0
        try:
            if hasattr(shape, 'adjustments') and len(shape.adjustments) > 0:
                corner_radius = round(shape.adjustments[0] * 100, 1)
        except:
            pass

        if text or fill_color or shape_type == 'image':
            shapes_data.append({
                'left': left_pct,
                'top': top_pct,
                'width': width_pct,
                'height': height_pct,
                'text': text,
                'fill': fill_color,
                'border': border_color,
                'borderWidth': border_width,
                'cornerRadius': corner_radius,
                'rotation': rotation,
                'type': shape_type,
                'paragraphs': paragraphs,
            })

    if not all_texts and not shapes_data:
        continue

    # Still extract title/subtitle/formats for metadata
    meaningful = [t for t in all_texts if not any(h in t.lower() for h in SKIP_HEADERS)]
    title = ''
    subtitle = ''
    formats = []
    content_blocks = []
    slide_number = ''
    cards = []
    kpis = []
    misc = []

    for t in meaningful:
        if t.upper() in FORMAT_TAGS:
            formats.append(t.upper())
            continue
        if len(t) <= 3 and t.isdigit():
            slide_number = t
            continue
        if t.startswith('GALENT') or t.startswith('SESSION FORMAT'):
            continue
        if not title and len(t) < 120:
            title = t
        elif not subtitle and len(t) < 120 and len(content_blocks) == 0:
            subtitle = t
        else:
            content_blocks.append(t)

    j = 0
    while j < len(content_blocks):
        block = content_blocks[j]
        if len(block) <= 5 and any(c.isdigit() for c in block) and j + 1 < len(content_blocks) and len(content_blocks[j+1]) < 40:
            kpis.append({"value": block, "label": content_blocks[j+1]})
            j += 2
            continue
        if len(block) < 50 and j + 1 < len(content_blocks) and len(content_blocks[j+1]) > 40:
            cards.append({"heading": block, "body": content_blocks[j+1]})
            j += 2
            continue
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
        "sectionName": "",
        "bgColor": bg_color,
        "shapes": shapes_data,
        "slideWidth": slide_w,
        "slideHeight": slide_h,
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
