import { APP_LOCALE, OPERATIONS_TIMEZONE } from "@/config/locale"

export { OPERATIONS_TIMEZONE }

export function firstName(name: string): string {
  const token = name.trim().split(/\s+/)[0]
  return token ?? name
}

export function greetingFor({
  now,
  timeZone,
  name,
}: {
  now: Date
  timeZone: string
  name: string
}): string {
  const hour = Number(
    new Intl.DateTimeFormat(APP_LOCALE, {
      timeZone,
      hour: "numeric",
      hour12: false,
    }).format(now),
  )
  const period =
    hour >= 5 && hour < 12
      ? "morning"
      : hour >= 12 && hour < 17
        ? "afternoon"
        : "evening"
  return `Good ${period}, ${firstName(name)}`
}
