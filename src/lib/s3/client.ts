import "server-only"

import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

import {
  contentTypeForFileName,
  voiceObjectKey,
} from "@/lib/s3/paths"

export {
  contentTypeForFileName,
  playableMediaPath,
  voiceFileNameFromMediaUrl,
  voiceMediaUrl,
  voiceObjectKey,
} from "@/lib/s3/paths"

export function isS3Configured(): boolean {
  return Boolean(
    process.env.S3_BUCKET?.trim() &&
      process.env.S3_ACCESS_KEY_ID?.trim() &&
      process.env.S3_SECRET_ACCESS_KEY?.trim() &&
      process.env.S3_ENDPOINT?.trim(),
  )
}

export function requireS3InProduction(): void {
  if (process.env.NODE_ENV === "production" && !isS3Configured()) {
    throw new Error(
      "Object storage is not configured. Set S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY.",
    )
  }
}

export function useS3VoiceStorage(): boolean {
  if (isS3Configured()) {
    return true
  }
  requireS3InProduction()
  return false
}

let cachedClient: S3Client | null = null

function getS3Client(): S3Client {
  if (cachedClient) {
    return cachedClient
  }
  const endpoint = process.env.S3_ENDPOINT?.trim()
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim()
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim()
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error("S3 credentials are not configured")
  }
  cachedClient = new S3Client({
    region: process.env.S3_REGION?.trim() || "auto",
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    // Railway / Tigris: virtual-hosted–style (bucket as subdomain)
    forcePathStyle: false,
  })
  return cachedClient
}

function bucketName(): string {
  const bucket = process.env.S3_BUCKET?.trim()
  if (!bucket) {
    throw new Error("S3_BUCKET is not configured")
  }
  return bucket
}

function presignExpiresSeconds(): number {
  const raw = process.env.S3_PRESIGN_EXPIRES_SECONDS?.trim()
  const parsed = raw ? Number(raw) : 86_400
  if (!Number.isFinite(parsed) || parsed < 60) {
    return 86_400
  }
  return Math.min(Math.floor(parsed), 60 * 60 * 24 * 7)
}

export async function putVoiceObject(input: {
  fileName: string
  body: Buffer
  contentType: string
}): Promise<void> {
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucketName(),
      Key: voiceObjectKey(input.fileName),
      Body: input.body,
      ContentType: input.contentType,
    }),
  )
}

export async function voiceObjectExists(fileName: string): Promise<boolean> {
  try {
    await getS3Client().send(
      new HeadObjectCommand({
        Bucket: bucketName(),
        Key: voiceObjectKey(fileName),
      }),
    )
    return true
  } catch {
    return false
  }
}

export async function getVoiceObject(fileName: string): Promise<{
  body: Buffer
  contentType: string
} | null> {
  try {
    const result = await getS3Client().send(
      new GetObjectCommand({
        Bucket: bucketName(),
        Key: voiceObjectKey(fileName),
      }),
    )
    if (!result.Body) {
      return null
    }
    const bytes = Buffer.from(await result.Body.transformToByteArray())
    return {
      body: bytes,
      contentType: result.ContentType || contentTypeForFileName(fileName),
    }
  } catch {
    return null
  }
}

export async function getPresignedVoiceUrl(fileName: string): Promise<string> {
  return getSignedUrl(
    getS3Client(),
    new GetObjectCommand({
      Bucket: bucketName(),
      Key: voiceObjectKey(fileName),
    }),
    { expiresIn: presignExpiresSeconds() },
  )
}
