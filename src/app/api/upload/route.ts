/**
 * File Upload API — handles multipart uploads, stores in S3, returns URLs.
 * Used by: whiteboard, intake, use cases, deal detail, and anywhere files are uploaded.
 */

import { NextRequest, NextResponse } from 'next/server';
import { uploadFile, workshopFileKey, platformFileKey } from '@/lib/storage/s3';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const entityType = formData.get('entityType') as string || 'general';
    const entityId = formData.get('entityId') as string || 'unknown';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const key = entityType === 'workshop'
      ? workshopFileKey(entityId, file.name)
      : platformFileKey(entityType, entityId, file.name);

    const result = await uploadFile({
      key,
      body: buffer,
      contentType: file.type || 'application/octet-stream',
      metadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        entityType,
        entityId,
      },
    });

    return NextResponse.json({
      success: true,
      key: result.key,
      url: result.url,
      name: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
