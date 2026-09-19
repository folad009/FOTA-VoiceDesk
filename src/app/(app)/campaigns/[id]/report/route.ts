import { formatInTimeZone } from "date-fns-tz"
import { NextResponse } from "next/server"

import { maskPhone } from "@/lib/phone"
import { buildAudienceCsv } from "@/server/campaigns/command-actions"
import { formatCallClock } from "@/server/campaigns/command-center"
import { OPERATIONS_TIMEZONE } from "@/server/dashboard/greeting"
import { prisma } from "@/server/db/prisma"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    select: { id: true, name: true, timezone: true },
  })
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
  }

  const recipients = await prisma.campaignRecipient.findMany({
    where: { campaignId: id },
    orderBy: [{ lastAttemptAt: "desc" }, { id: "asc" }],
    include: {
      contact: { select: { name: true, phoneE164: true } },
      attempts: {
        orderBy: { attemptNumber: "desc" },
        take: 1,
        select: { durationSeconds: true },
      },
    },
  })

  if (recipients.length === 0) {
    return NextResponse.json({ error: "Nothing to export" }, { status: 400 })
  }

  const csv = buildAudienceCsv(
    recipients.map((row) => ({
      name: row.contact.name,
      phone: maskPhone(row.contact.phoneE164),
      status: row.status,
      attempts: row.attemptCount,
      duration:
        row.attempts[0]?.durationSeconds != null
          ? formatCallClock(row.attempts[0].durationSeconds)
          : "—",
      lastAttempt: row.lastAttemptAt
        ? formatInTimeZone(
            row.lastAttemptAt,
            campaign.timezone || OPERATIONS_TIMEZONE,
            "d MMM h:mm a",
          )
        : "—",
    })),
  )

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug(campaign.name)}-report.csv"`,
    },
  })
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "campaign"
}
