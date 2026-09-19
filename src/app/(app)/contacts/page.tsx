import type { Metadata } from "next"
import Link from "next/link"
import { FolderUpIcon, UsersIcon } from "lucide-react"

import { getContactDirectory } from "@/server/contacts/get-contact-directory"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DashboardErrorState } from "@/components/dashboard/dashboard-error"

export const metadata: Metadata = {
  title: "Contacts",
}

export default async function ContactsPage() {
  try {
    const directory = await getContactDirectory()
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Contacts"
          description="Recipient directory with masked phone numbers and group membership."
          actions={
            <Button asChild>
              <Link href="/contacts/import">
                <FolderUpIcon data-icon="inline-start" />
                Import contacts
              </Link>
            </Button>
          }
        />
        {directory.total === 0 ? (
          <SectionEmpty
            icon={UsersIcon}
            title="No contacts imported"
            description="Import a CSV or Excel file to build the audience for voice campaigns."
          />
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground tabular-nums">
              {directory.total.toLocaleString()} contacts
            </p>
            <DataTableFrame>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Groups</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {directory.rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="tabular-nums">{row.phone}</TableCell>
                      <TableCell className="text-muted-foreground">{row.email ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {row.groups.length === 0 ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            row.groups.map((group) => (
                              <Badge key={group} variant="secondary">
                                {group}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DataTableFrame>
          </div>
        )}
      </div>
    )
  } catch (error) {
    console.error("Contacts directory failed", error)
    return (
      <DashboardErrorState message="Unable to load contacts. Check that the database is available." />
    )
  }
}
