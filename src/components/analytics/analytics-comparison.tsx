import Link from "next/link"
import { MegaphoneIcon } from "lucide-react"

import { formatCallClock } from "@/server/campaigns/command-center"
import {
  formatAnalyticsRate,
  type ComparisonRow,
} from "@/server/analytics/compute"
import { SectionEmpty } from "@/components/section-empty"
import {
  DataTableFrame,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/data-table"

export function AnalyticsComparisonTable({ rows }: { rows: ComparisonRow[] }) {
  if (rows.length === 0) {
    return (
      <SectionEmpty
        icon={MegaphoneIcon}
        title="No campaign calls to compare"
        description="The table lists campaigns that placed at least one call in the selected range."
      />
    )
  }

  return (
    <DataTableFrame>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Campaign</TableHead>
            <TableHead>Recipients</TableHead>
            <TableHead>Calls</TableHead>
            <TableHead>Answered</TableHead>
            <TableHead>Answer Rate</TableHead>
            <TableHead>Avg Duration</TableHead>
            <TableHead>Retries</TableHead>
            <TableHead>Failed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.campaignId}>
              <TableCell className="font-medium">
                <Link href={`/campaigns/${row.campaignId}`} className="hover:underline">
                  {row.campaign}
                </Link>
              </TableCell>
              <TableCell className="tabular-nums">{row.recipients}</TableCell>
              <TableCell className="tabular-nums">{row.calls}</TableCell>
              <TableCell className="tabular-nums">{row.answered}</TableCell>
              <TableCell className="tabular-nums">{formatAnalyticsRate(row.answerRate)}</TableCell>
              <TableCell className="tabular-nums">
                {row.averageDurationSeconds === null
                  ? "—"
                  : formatCallClock(row.averageDurationSeconds)}
              </TableCell>
              <TableCell className="tabular-nums">{row.retries}</TableCell>
              <TableCell className="tabular-nums">{row.failed}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTableFrame>
  )
}
