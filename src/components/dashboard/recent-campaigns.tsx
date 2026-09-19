import Link from "next/link"
import { MoreHorizontalIcon } from "lucide-react"

import type { RecentCampaignRow } from "@/server/dashboard/get-dashboard-data"
import { CampaignStatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  DataTableFrame,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/data-table"

export function RecentCampaignsTable({ rows }: { rows: RecentCampaignRow[] }) {
  return (
    <DataTableFrame>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Campaign</TableHead>
            <TableHead>Audience</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Recipients</TableHead>
            <TableHead>Answer Rate</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-12">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">
                <Link href={`/campaigns/${row.id}`} className="hover:underline">
                  {row.name}
                </Link>
              </TableCell>
              <TableCell>{row.audience}</TableCell>
              <TableCell className="tabular-nums text-muted-foreground">
                {row.createdLabel}
              </TableCell>
              <TableCell className="tabular-nums">{row.recipients}</TableCell>
              <TableCell className="tabular-nums">{row.answerRate}</TableCell>
              <TableCell>
                <CampaignStatusBadge status={row.status} />
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${row.name}`}>
                      <MoreHorizontalIcon />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/campaigns/${row.id}`}>View campaign</Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTableFrame>
  )
}
