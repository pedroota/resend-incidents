import type { JsonValue } from "@api/common/json/types"
import { alertsQueue } from "@api/common/queue/queues"
import { destinationsRepository } from "@api/modules/destinations/repositories/destinations.repository"
import { incidentOpenedEventDto } from "@api/modules/incidents/dtos/incident-opened-event.dto"
import { INCIDENT_ALERT_DELIVERY_JOB } from "@api/modules/incidents/constants/incidents.constants"
import { incidentsRepository } from "@api/modules/incidents/repositories/incidents.repository"

// One delivery job per destination, so a failing channel retries without re-posting to the others.
async function process(payload: JsonValue) {
  const { incidentId } = incidentOpenedEventDto.parse(payload)
  const incident = await incidentsRepository.findById(incidentId)

  if (!incident || incident.resolvedAt) {
    return
  }

  const destinationIds = await destinationsRepository.listIds(
    incident.installationId
  )

  await alertsQueue.enqueueBulk(
    destinationIds.map((destinationId) => ({
      name: INCIDENT_ALERT_DELIVERY_JOB,
      data: { incidentId, destinationId },
      opts: {
        jobId: `${INCIDENT_ALERT_DELIVERY_JOB}~${incidentId}~${destinationId}`
      }
    }))
  )
}

export const incidentOpenedConsumer = {
  process
}
