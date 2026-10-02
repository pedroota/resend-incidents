import { logger } from "@api/common/logger/client"
import {
  DETECTION_WINDOW_MS,
  INCIDENT_RECOVERY_MS
} from "@api/modules/incidents/constants/incidents.constants"
import { incidentsRepository } from "@api/modules/incidents/repositories/incidents.repository"
import type {
  DomainWindow,
  IncidentChange,
  IncidentSeverity
} from "@api/modules/incidents/types/incidents.types"
import { COUNTER_WINDOW_MS } from "@api/modules/webhooks/constants/webhooks.constants"

// Groups a repeat detection into the open incident; severity only escalates, the peak only rises.
async function recordRepeatDetection(
  installationId: string,
  window: DomainWindow,
  severity: IncidentSeverity
): Promise<IncidentChange | null> {
  const incident = await incidentsRepository.findOpen(
    installationId,
    window.domain
  )

  if (!incident) {
    return null
  }

  // Rates are cross-multiplied so none is ever stored.
  const isPeakRaised =
    window.bounced * incident.bounce.peakSent >
    incident.bounce.peakBounced * window.sent
  const isEscalated = severity === "critical" && incident.severity === "warning"

  if (!isPeakRaised && !isEscalated) {
    await incidentsRepository.clearRecovery(incident.id)
    return null
  }

  const change = isEscalated ? "escalated" : "peak_raised"
  const updatedIncident = await incidentsRepository.updateWithEvent(
    incident,
    isEscalated ? severity : incident.severity,
    isPeakRaised ? window : null,
    change
  )

  return updatedIncident ? change : null
}

// Domains the rule no longer fires for start recovering; past 30 minutes they resolve with the emails affected since the window that opened them.
async function resolveRecovered(
  installationId: string,
  firingDomains: string[]
): Promise<number> {
  const now = new Date()

  await incidentsRepository.markRecovering(installationId, firingDomains, now)

  const recoveredIncidents = await incidentsRepository.listRecovered(
    installationId,
    new Date(now.getTime() - INCIDENT_RECOVERY_MS)
  )

  let resolvedCount = 0

  for (const recoveredIncident of recoveredIncidents) {
    const countedSince = new Date(
      Math.floor(recoveredIncident.openedAt.getTime() / COUNTER_WINDOW_MS) *
        COUNTER_WINDOW_MS -
        DETECTION_WINDOW_MS +
        COUNTER_WINDOW_MS
    )
    const affected = await incidentsRepository.sumDomainCounts(
      installationId,
      recoveredIncident.domain,
      countedSince
    )
    const incident = await incidentsRepository.resolveWithEvent(
      recoveredIncident.id,
      affected
    )

    if (!incident) {
      continue
    }

    logger.info("Incident resolved", {
      installationId,
      incidentId: incident.id,
      domain: incident.domain
    })
    resolvedCount += 1
  }

  return resolvedCount
}

export const incidentsService = {
  recordRepeatDetection,
  resolveRecovered
}
