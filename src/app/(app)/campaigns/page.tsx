import type { Metadata } from "next"
import Link from "next/link"
import { MegaphoneIcon } from "lucide-react"

import { CampaignStatusBadge } from "@/components/status-badge"
import { PageHeader } from "@/components/page-header"
import { SectionEmpty } from "@/components/section-empty"
import { DashboardErrorState } from "@/components/dashboard/dashboard-error"
import { Button } from "@/components/ui/button"
import {
  DataTableFrame,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/data-table"
import { prisma } from "@/server/db/prisma"
import { formatLagosDate } from "@/lib/datetime"

export const metadata: Metadata = {
  title: "Campaigns",
}

async function listCampaigns() {
  return prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      group: { select: { name: true } },
      _count: { select: { recipients: true } },
    },
  })
}

export default async function CampaignsPage() {
  let campaigns: Awaited<ReturnType<typeof listCampaigns>>
  try {
    campaigns = await listCampaigns()
  } catch (error) {
    console.error("Campaign list failed", error)
    return (
      <div className="flex flex-col gap-8">
        <PageHeader
          title="Campaigns"
          description="Create, schedule, and operate voice campaigns."
        />
        <DashboardErrorState message="Unable to load campaigns. Check that the database is available." />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Campaigns"
        description="Create, schedule, and operate voice campaigns."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/campaigns/new?template=gkc-2026-conference-reminder">
                GKC 2026 template
              </Link>
            </Button>
            <Button asChild>
              <Link href="/campaigns/new">New campaign</Link>
            </Button>
          </div>
        }
      />
      {campaigns.length === 0 ? (
        <SectionEmpty
          icon={MegaphoneIcon}
          title="No campaigns yet"
          description="Campaigns will list here with live delivery state. Create one to start calling."
        />
      ) : (
        <DataTableFrame>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Audience</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">
                    <Link href={`/campaigns/${campaign.id}`} className="hover:underline">
                      {campaign.name}
                    </Link>
                  </TableCell>
                  <TableCell>{campaign.group?.name ?? "—"}</TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {formatLagosDate(campaign.createdAt)}
                  </TableCell>
                  <TableCell className="tabular-nums">{campaign._count.recipients}</TableCell>
                  <TableCell>
                    <CampaignStatusBadge status={campaign.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableFrame>
      )}
    </div>
  )
}
