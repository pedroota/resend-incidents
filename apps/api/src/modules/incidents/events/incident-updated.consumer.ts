import type { JsonValue } from "@api/common/json/types"
import { alertsQueue } from "@api/common/queue/queues"
import { INCIDENT_UPDATE_DELIVERY_JOB } from "@api/modules/incidents/constants/incidents.constants"
import { incidentUpdatedEventDto } from "@api/modules/incidents/dtos/incident-updated-event.dto"
import { incidentsRepository } from "@api/modules/incidents/repositories/incidents.repository"

// Only destinations that received the opening alert have a message to update.
async function process(payload: JsonValue) {
  const { incidentId, change, occurredAt } =
    incidentUpdatedEventDto.parse(payload)

  const [incident, destinationIds] = await Promise.all([
    incidentsRepository.findById(incidentId),
    incidentsRepository.listNotifiedDestinationIds(incidentId)
  ])

  if (!incident || destinationIds.length === 0) {
    return
  }

  const occurredAtMs = new Date(occurredAt).getTime()

  await alertsQueue.enqueueBulk(
    destinationIds.map((destinationId) => ({
      name: INCIDENT_UPDATE_DELIVERY_JOB,
      data: {
        incidentId,
        destinationId,
        change
      },
      opts: {
        jobId: `${INCIDENT_UPDATE_DELIVERY_JOB}~${incidentId}~${destinationId}~${change}~${occurredAtMs}`
      }
    }))
  )
}

export const incidentUpdatedConsumer = {
  process
}
