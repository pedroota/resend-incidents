import type { JsonValue } from "@api/common/json/types"
import { logger } from "@api/common/logger/client"
import { eventBusService } from "@api/modules/events/services/event-bus.service"
import { incidentDetectionJobDto } from "@api/modules/incidents/dtos/incident-detection-job.dto"
import { incidentsRepository } from "@api/modules/incidents/repositories/incidents.repository"
import { evaluateBounceSpike } from "@api/modules/incidents/rules/bounce-spike.rule"
import { incidentsService } from "@api/modules/incidents/services/incidents.service"

// Runs the bounce rule over the 1h counter windows. Safe to retry: repeat detections only report a change once, and resolving is guarded.
async function process(payload: JsonValue) {
  const { installationId, since } = incidentDetectionJobDto.parse(payload)

  const windows = await incidentsRepository.listDomainWindows(
    installationId,
    new Date(since)
  )
  const bouncingDomains: string[] = []
  let publishedCount = 0

  for (const window of windows) {
    const spike = evaluateBounceSpike(window.sent, window.bounced)

    if (!spike) {
      continue
    }

    bouncingDomains.push(window.domain)

    const incident = await incidentsRepository.openWithEvent({
      installationId,
      domain: window.domain,
      severity: spike.severity,
      bounce: { peakSent: window.sent, peakBounced: window.bounced }
    })

    if (incident) {
      logger.info("Bounce spike incident opened", {
        installationId,
        incidentId: incident.id,
        domain: window.domain,
        severity: spike.severity
      })
      publishedCount += 1
      continue
    }

    // Already open: group into it, raising peak and severity.
    const change = await incidentsService.recordRepeatDetection(
      installationId,
      window,
      spike.severity
    )

    if (!change) {
      continue
    }

    logger.info("Bounce spike incident updated", {
      installationId,
      domain: window.domain,
      change
    })
    publishedCount += 1
  }

  // Domains below threshold, or below the volume floor, count as recovered.
  publishedCount += await incidentsService.resolveRecovered(
    installationId,
    bouncingDomains
  )

  if (publishedCount > 0) {
    eventBusService.flushPendingEvents()
  }
}

export const incidentDetectionJob = {
  process
}
