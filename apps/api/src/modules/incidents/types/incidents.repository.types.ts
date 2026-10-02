import type { bounceIncidents, incidents } from "@api/common/database/schema"
import type { IncidentSeverity } from "@api/modules/incidents/types/incidents.types"

export type Incident = typeof incidents.$inferSelect & {
  bounce: typeof bounceIncidents.$inferSelect
}

export interface OpenIncident {
  installationId: string
  domain: string
  severity: IncidentSeverity
  bounce: Omit<typeof bounceIncidents.$inferInsert, "incidentId">
}
