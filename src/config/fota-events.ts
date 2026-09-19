export type FotaEvent = {
  id: string
  title: string
  datesLabel: string
  location: string
}

export const fotaEvents = {
  gkc2026: {
    id: "gkc-2026",
    title: "Giant Killer Conference 2026",
    datesLabel: "12–18 October 2026",
    location: "FOTA Surulere, Lagos",
  },
} as const satisfies Record<string, FotaEvent>
