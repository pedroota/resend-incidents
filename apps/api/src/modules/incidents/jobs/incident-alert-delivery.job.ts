import type { JsonValue } from "@api/common/json/types"
import { logger } from "@api/common/logger/client"
import { destinationsService } from "@api/modules/destinations/services/destinations.service"
import { incidentAlertDeliveryJobDto } from "@api/modules/incidents/dtos/incident-alert-delivery-job.dto"
import { incidentsRepository } from "@api/modules/incidents/repositories/incidents.repository"
import { incidentAlert } from "@api/modules/incidents/utils/incident-alert"

// Throws only on transient failures so BullMQ retries; a broken channel is logged and dropped.
async function process(payload: JsonValue) {
  const { incidentId, destinationId } =
    incidentAlertDeliveryJobDto.parse(payload)

  const isDelivered = await incidentsRepository.hasNotification(
    incidentId,
    destinationId
  )

  if (isDelivered) {
    return
  }

  const incident = await incidentsRepository.findById(incidentId)

  if (!incident || incident.resolvedAt) {
    return
  }

  const alertDelivery = await destinationsService.sendAlert(
    incident.installationId,
    destinationId,
    incidentAlert(incident)
  )

  if (
    !alertDelivery.success &&
    alertDelivery.error === "destination_unavailable"
  ) {
    throw new Error(`Alert delivery to ${destinationId} is unavailable`)
  }

  if (!alertDelivery.success) {
    logger.warn("Incident alert dropped", {
      incidentId,
      destinationId,
      error: alertDelivery.error
    })
    return
  }

  await incidentsRepository.recordNotification(
    incidentId,
    destinationId,
    alertDelivery.messageRef
  )
}

export const incidentAlertDeliveryJob = {
  process
}
