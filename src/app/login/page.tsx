import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { loginAction } from "@/app/login/actions"
import { getSessionUser } from "@/server/auth/session"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"

export const metadata: Metadata = {
  title: "Sign in",
}

export default async function LoginPage() {
  const session = await getSessionUser()
  if (session) {
    redirect("/dashboard")
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-md border border-border bg-card p-6">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          FOTA VoiceDesk
        </p>
        <h1 className="mt-2 text-xl font-medium tracking-tight">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Communications operators use this console to launch and monitor voice campaigns.
        </p>
        <form action={loginAction} className="mt-6">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </Field>
            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </FieldGroup>
        </form>
      </div>
    </main>
  )
}
