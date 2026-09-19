import type { Metadata } from "next"

import { ContactImportWizard } from "@/components/contact-import/contact-import-wizard"
import { DashboardErrorState } from "@/components/dashboard/dashboard-error"
import { getImportContext } from "@/server/contacts/get-import-context"

export const metadata: Metadata = {
  title: "Import Contacts",
}

export default async function ImportContactsPage() {
  try {
    const context = await getImportContext()
    return <ContactImportWizard existingPhones={context.existingPhones} />
  } catch (error) {
    console.error("Import context failed", error)
    return (
      <DashboardErrorState message="Unable to load import. Check that the database is available." />
    )
  }
}
