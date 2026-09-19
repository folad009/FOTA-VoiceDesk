import type { ReactNode } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow }

export function DataTableFrame({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-card">
      {children}
    </div>
  )
}
