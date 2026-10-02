import type { IncidentSeverity } from "@api/modules/incidents/types/incidents.types"

export interface IncidentAlert {
  status: "open" | "resolved"
  severity: IncidentSeverity
  title: string
  domain: string
  observed: string
  summary: string
  impact: string
  startedAt: Date
  resendUrl: string
}

export type DestinationError =
  | "channel_not_found"
  | "missing_permissions"
  | "destination_unavailable"
