import { logger } from "@api/common/logger/client"
import { jobsQueue } from "@api/common/queue/queues"
import { RELAY_BATCH_SIZE } from "@api/modules/events/constants/events.constants"
import { outboxRepository } from "@api/modules/events/repositories/outbox.repository"
import type {
  EventProcessor,
  OutboxEvent,
  OutboxEventName
} from "@api/modules/events/types/events.types"

const consumerIdsByEvent = new Map<OutboxEventName, string[]>()

// Each consumer runs as its own job, so side effects retry independently.
function subscribe(
  eventName: OutboxEventName,
  consumerId: string,
  processor: EventProcessor
) {
  jobsQueue.registerProcessors({ [`${eventName}~${consumerId}`]: processor })
  consumerIdsByEvent.set(eventName, [
    ...(consumerIdsByEvent.get(eventName) ?? []),
    consumerId
  ])
}

// Throws if any enqueue fails, leaving the row pending; re-enqueued jobs dedupe by jobId.
async function enqueueToConsumers(event: OutboxEvent) {
  const consumerIds = consumerIdsByEvent.get(event.eventName) ?? []

  if (consumerIds.length === 0) {
    logger.warn("Outbox event has no consumers", {
      eventName: event.eventName,
      dedupeKey: event.dedupeKey
    })
  }

  await Promise.all(
    consumerIds.map((consumerId) =>
      jobsQueue.enqueue(`${event.eventName}~${consumerId}`, event.payload, {
        jobId: `${event.eventName}~${consumerId}~${event.dedupeKey}`
      })
    )
  )
}

// At-least-once: a failed event stays pending for the next tick without blocking the batch.
async function relayPendingEvents() {
  const pendingEvents = await outboxRepository.listPending(RELAY_BATCH_SIZE)

  for (const pendingEvent of pendingEvents) {
    try {
      await enqueueToConsumers(pendingEvent)
      await outboxRepository.markProcessed(pendingEvent.id)
    } catch (error) {
      logger.error("Outbox event relay failed", {
        eventId: pendingEvent.id,
        eventName: pendingEvent.eventName,
        error
      })
    }
  }
}

// Best-effort fast path after a publish; the scheduled relay guarantees delivery.
function flushPendingEvents() {
  void relayPendingEvents().catch((error) => {
    logger.error("Outbox flush failed", { error })
  })
}

export const eventBusService = {
  subscribe,
  relayPendingEvents,
  flushPendingEvents
}
