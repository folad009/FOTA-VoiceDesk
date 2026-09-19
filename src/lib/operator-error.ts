export function operatorErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) {
    return fallback
  }
  const message = error.message.trim()
  if (message.length === 0 || message.length > 160) {
    return fallback
  }
  if (
    /postgres|postgresql|econnrefused|prisma|database server|p1001|p2021|p2022|can't reach database/i.test(
      message,
    )
  ) {
    return fallback
  }
  return message
}
