"use server"

import { importContactBatch } from "@/server/contacts/import-contacts"
import type { ImportableContact } from "@/server/contacts/import-workflow"

export async function importContactBatchAction(
  rows: ImportableContact[],
): Promise<{ imported: number; skippedExisting: number }> {
  if (rows.length === 0) {
    return { imported: 0, skippedExisting: 0 }
  }
  if (rows.length > 100) {
    throw new Error("Import batch is too large")
  }
  for (const row of rows) {
    if (!row.name.trim() || !row.phoneE164.startsWith("+234")) {
      throw new Error("Import payload is invalid")
    }
  }
  return importContactBatch(rows)
}
