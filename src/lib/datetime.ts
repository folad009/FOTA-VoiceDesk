import { formatInTimeZone } from "date-fns-tz"

import { APP_TIMEZONE } from "@/config/locale"

export function formatLagosDate(date: Date): string {
  return formatInTimeZone(date, APP_TIMEZONE, "d MMM yyyy")
}

export function formatLagosTime(date: Date): string {
  return formatInTimeZone(date, APP_TIMEZONE, "HH:mm")
}

export function formatLagosDateTime(date: Date): string {
  return `${formatLagosDate(date)}, ${formatLagosTime(date)}`
}

export function formatLagosLongDate(date: Date): string {
  return formatInTimeZone(date, APP_TIMEZONE, "d MMMM yyyy")
}
