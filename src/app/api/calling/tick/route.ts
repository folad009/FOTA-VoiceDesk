import { processDueCalls } from "@/server/calling/engine"

export const dynamic = "force-dynamic"

export async function POST(request: Request): Promise<Response> {
  return runTick(request)
}

export async function GET(request: Request): Promise<Response> {
  return runTick(request)
}

async function runTick(request: Request): Promise<Response> {
  const secret = process.env.CALLING_TICK_SECRET?.trim()
  if (secret) {
    const header = request.headers.get("authorization") ?? ""
    if (header !== `Bearer ${secret}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
  } else if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await processDueCalls()
    return Response.json(result)
  } catch (error) {
    console.error("[calling.tick] failed", error)
    return Response.json({ error: "Calling tick failed" }, { status: 500 })
  }
}
