import { logger } from "@api/common/logger/client"
import {
  COUNTER_RETENTION_MS,
  DELIVERY_RETENTION_MS
} from "@api/modules/webhooks/constants/webhooks.constants"
import { webhookEventsRepository } from "@api/modules/webhooks/repositories/webhook-events.repository"

// Scheduled hourly; safe to overlap or retry since it only deletes expired rows.
async function process() {
  const now = Date.now()

  const deletedCounters = await webhookEventsRepository.deleteCountersBefore(
    new Date(now - COUNTER_RETENTION_MS)
  )
  const deletedDeliveries =
    await webhookEventsRepository.deleteDeliveriesBefore(
      new Date(now - DELIVERY_RETENTION_MS)
    )

  if (deletedCounters + deletedDeliveries > 0) {
    logger.info("Expired webhook data deleted", {
      deletedCounters,
      deletedDeliveries
    })
  }
}

export const webhookDataRetentionJob = {
  process
}
