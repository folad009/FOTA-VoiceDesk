"use server"

import { redirect } from "next/navigation"

import { createSession } from "@/server/auth/session"
import { operatorErrorMessage } from "@/lib/operator-error"

export async function loginAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "")
  const password = String(formData.get("password") ?? "")
  if (!email.trim() || !password) {
    throw new Error("Enter your email and password")
  }
  try {
    await createSession(email, password)
  } catch (error) {
    throw new Error(operatorErrorMessage(error, "Unable to sign in"))
  }
  redirect("/dashboard")
}
