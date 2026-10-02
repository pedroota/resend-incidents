import type { JsonValue } from "@api/common/json/types"
import { logger } from "@api/common/logger/client"
import { destinationsService } from "@api/modules/destinations/services/destinations.service"
import { incidentUpdateDeliveryJobDto } from "@api/modules/incidents/dtos/incident-update-delivery-job.dto"
import { incidentsRepository } from "@api/modules/incidents/repositories/incidents.repository"
import {
  incidentAlert,
  incidentChangeNote
} from "@api/modules/incidents/utils/incident-alert"

// Same retry contract as the opening alert: throw on transient failures, drop a broken channel.
async function process(payload: JsonValue) {
  const { incidentId, destinationId, change } =
    incidentUpdateDeliveryJobDto.parse(payload)

  const [incident, messageRef] = await Promise.all([
    incidentsRepository.findById(incidentId),
    incidentsRepository.findMessageRef(incidentId, destinationId)
  ])

  if (!incident || !messageRef) {
    return
  }

  // A peak update that lands after resolution would reopen nothing, only add noise.
  if (change !== "resolved" && incident.resolvedAt) {
    return
  }

  const updateDelivery = await destinationsService.updateAlert(
    incident.installationId,
    destinationId,
    messageRef,
    incidentAlert(incident),
    incidentChangeNote(incident, change)
  )

  if (
    !updateDelivery.success &&
    updateDelivery.error === "destination_unavailable"
  ) {
    throw new Error(`Incident update to ${destinationId} is unavailable`)
  }

  if (!updateDelivery.success) {
    logger.warn("Incident update dropped", {
      incidentId,
      destinationId,
      change,
      error: updateDelivery.error
    })
  }
}

export const incidentUpdateDeliveryJob = {
  process
}
