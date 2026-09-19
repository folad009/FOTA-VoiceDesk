import type { Metadata } from "next"
import Link from "next/link"
import { LayersIcon } from "lucide-react"

import { getContactGroups } from "@/server/contacts/get-contact-groups"
import { DashboardErrorState } from "@/components/dashboard/dashboard-error"
import { PageHeader } from "@/components/page-header"
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
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Groups",
}

export default async function GroupsPage() {
  try {
    const groups = await getContactGroups()
    return (
      <div className="flex flex-col gap-8">
        <PageHeader
          title="Groups"
          description="Calling audiences assembled from imported contacts."
          actions={
            <Button asChild>
              <Link href="/contacts/import">Import contacts</Link>
            </Button>
          }
        />
        {groups.length === 0 ? (
          <SectionEmpty
            icon={LayersIcon}
            title="No groups yet"
            description="Groups are created during contact import when a Group column is mapped. Use them as campaign audiences."
          />
        ) : (
          <DataTableFrame>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Group</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell>
                      <p className="font-medium">{group.name}</p>
                      {group.description ? (
                        <p className="mt-1 text-xs text-muted-foreground">{group.description}</p>
                      ) : null}
                    </TableCell>
                    <TableCell className="tabular-nums">{group.memberCount.toLocaleString()}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {group.createdLabel}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableFrame>
        )}
      </div>
    )
  } catch (error) {
    console.error("Groups list failed", error)
    return (
      <DashboardErrorState message="Unable to load groups. Check that the database is available." />
    )
  }
}
