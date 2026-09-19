import { readFile } from "node:fs/promises"
import path from "node:path"

import {
  contentTypeForFileName,
  getPresignedVoiceUrl,
  getVoiceObject,
  isS3Configured,
} from "@/lib/s3/client"

export const dynamic = "force-dynamic"

const FILE_NAME_PATTERN = /^[a-zA-Z0-9._-]+$/

export async function GET(
  _request: Request,
  context: { params: Promise<{ filename: string }> },
): Promise<Response> {
  const { filename } = await context.params
  if (!filename || !FILE_NAME_PATTERN.test(filename)) {
    return new Response("Not found", { status: 404 })
  }

  if (isS3Configured()) {
    // Prefer redirect to a short-lived signed URL so Twilio fetches audio directly.
    try {
      const signed = await getPresignedVoiceUrl(filename)
      return Response.redirect(signed, 302)
    } catch {
      const object = await getVoiceObject(filename)
      if (!object) {
        return new Response("Not found", { status: 404 })
      }
      return new Response(new Uint8Array(object.body), {
        status: 200,
        headers: {
          "Content-Type": object.contentType,
          "Cache-Control": "private, max-age=3600",
        },
      })
    }
  }

  try {
    const filePath = path.join(process.cwd(), "public", "uploads", "voice", filename)
    const body = await readFile(filePath)
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": contentTypeForFileName(filename),
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch {
    return new Response("Not found", { status: 404 })
  }
}
