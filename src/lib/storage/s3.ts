/**
 * S3 Storage Service — file uploads for the platform DAM.
 * Stores: audio recordings, images, documents, screenshots.
 * Returns public URLs for retrieval.
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const BUCKET = process.env.S3_BUCKET || 'salespilot-files-462778606820';
const REGION = process.env.AWS_REGION || 'us-east-1';

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (!_client) {
    _client = new S3Client({
      region: REGION,
      // Uses default credential chain (env vars, IAM role, instance profile)
    });
  }
  return _client;
}

/**
 * Upload a file to S3.
 * @returns The S3 key (path) of the uploaded file.
 */
export async function uploadFile(params: {
  key: string;
  body: Buffer | Uint8Array | string;
  contentType: string;
  metadata?: Record<string, string>;
}): Promise<{ key: string; url: string }> {
  const client = getClient();
  await client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: params.key,
    Body: params.body,
    ContentType: params.contentType,
    Metadata: params.metadata,
  }));

  return {
    key: params.key,
    url: `https://${BUCKET}.s3.${REGION}.amazonaws.com/${params.key}`,
  };
}

/**
 * Generate a presigned URL for upload (client-side direct upload).
 */
export async function getUploadUrl(key: string, contentType: string, expiresIn = 3600): Promise<string> {
  const client = getClient();
  return getSignedUrl(client, new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  }), { expiresIn });
}

/**
 * Generate a presigned URL for download.
 */
export async function getDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  const client = getClient();
  return getSignedUrl(client, new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  }), { expiresIn });
}

/**
 * Delete a file from S3.
 */
export async function deleteFile(key: string): Promise<void> {
  const client = getClient();
  await client.send(new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  }));
}

/**
 * Generate a storage key for a workshop file.
 */
export function workshopFileKey(workshopId: string, fileName: string): string {
  const timestamp = Date.now().toString(36);
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `workshops/${workshopId}/${timestamp}-${safeName}`;
}

/**
 * Generate a storage key for a general platform file.
 */
export function platformFileKey(entityType: string, entityId: string, fileName: string): string {
  const timestamp = Date.now().toString(36);
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${entityType}/${entityId}/${timestamp}-${safeName}`;
}
