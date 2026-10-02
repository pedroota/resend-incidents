import { logger } from "@api/common/logger/client"
import { PROCESSED_EVENT_RETENTION_MS } from "@api/modules/events/constants/events.constants"
import { outboxRepository } from "@api/modules/events/repositories/outbox.repository"

// Scheduled hourly; only processed events expire.
async function process() {
  const deletedEvents = await outboxRepository.deleteProcessedBefore(
    new Date(Date.now() - PROCESSED_EVENT_RETENTION_MS)
  )

  if (deletedEvents > 0) {
    logger.info("Processed outbox events deleted", { deletedEvents })
  }
}

export const eventOutboxRetentionJob = {
  process
}
