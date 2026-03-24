// =============================================================================
// MinIO / S3 Storage Client
// Compatible with any S3-compatible storage (MinIO, AWS S3, etc.)
// =============================================================================

const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');

const s3 = new S3Client({
  endpoint:         process.env.S3_ENDPOINT || 'http://minio:9000',
  region:           process.env.S3_REGION   || 'us-east-1',
  credentials: {
    accessKeyId:     process.env.S3_ACCESS_KEY || 'minioadmin',
    secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin',
  },
  forcePathStyle: true,   // required for MinIO
});

const BUCKET = process.env.S3_BUCKET || 'autoads-creatives';

// Public base URL (used to build download links)
// In dev: http://localhost:9000, in prod: https://cdn.yourdomain.com
const PUBLIC_URL = (process.env.S3_PUBLIC_URL || 'http://localhost:9000').replace(/\/$/, '');

/**
 * Upload a file buffer to MinIO/S3
 * @param {Buffer} buffer      - file content
 * @param {string} key         - object key (path in bucket), e.g. "workspace_id/uuid.jpg"
 * @param {string} mimetype    - MIME type, e.g. "image/jpeg"
 * @returns {string} public URL of the uploaded file
 */
async function uploadFile(buffer, key, mimetype) {
  await s3.send(new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         key,
    Body:        buffer,
    ContentType: mimetype,
  }));
  return getPublicUrl(key);
}

/**
 * Delete a file from MinIO/S3
 * @param {string} key - object key
 */
async function deleteFile(key) {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

/**
 * Build the public URL for an object key
 * @param {string} key
 * @returns {string}
 */
function getPublicUrl(key) {
  return `${PUBLIC_URL}/${BUCKET}/${key}`;
}

/**
 * Extract object key from a full MinIO URL
 * e.g. "http://localhost:9000/autoads-creatives/ws/file.jpg" → "ws/file.jpg"
 * Returns null if URL doesn't match this bucket
 */
function extractKey(url) {
  if (!url) return null;
  const prefix = `${PUBLIC_URL}/${BUCKET}/`;
  if (url.startsWith(prefix)) return url.slice(prefix.length);
  // also handle internal docker URL
  const internalPrefix = `${(process.env.S3_ENDPOINT || 'http://minio:9000').replace(/\/$/, '')}/${BUCKET}/`;
  if (url.startsWith(internalPrefix)) return url.slice(internalPrefix.length);
  return null;
}

module.exports = { s3, uploadFile, deleteFile, getPublicUrl, extractKey, BUCKET };
