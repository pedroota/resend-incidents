import { lt, sql } from "drizzle-orm"
import { database } from "@api/common/database"
import {
  domainWindowCounters,
  webhookDeliveries
} from "@api/common/database/schema"
import { RETENTION_BATCH_SIZE } from "@api/modules/webhooks/constants/webhooks.constants"
import type { CountedEmailEvent } from "@api/modules/webhooks/types/webhook-events.types"

// Returns false when this delivery was already counted.
async function incrementCounters(
  event: CountedEmailEvent,
  windowStart: Date
): Promise<boolean> {
  return database.transaction(async (tx) => {
    const [delivery] = await tx
      .insert(webhookDeliveries)
      .values({ installationId: event.installationId, svixId: event.svixId })
      .onConflictDoNothing()
      .returning({ svixId: webhookDeliveries.svixId })

    if (!delivery) {
      return false
    }

    const counter = domainWindowCounters[event.counter]

    await tx
      .insert(domainWindowCounters)
      .values({
        installationId: event.installationId,
        domain: event.domain,
        windowStart,
        [event.counter]: 1
      })
      .onConflictDoUpdate({
        target: [
          domainWindowCounters.installationId,
          domainWindowCounters.domain,
          domainWindowCounters.windowStart
        ],
        set: { [event.counter]: sql`${counter} + 1` }
      })

    return true
  })
}

// Batched by `ctid`, so no single statement holds long locks.
async function deleteCountersBefore(before: Date): Promise<number> {
  let deletedCount = 0
  let batchCount = RETENTION_BATCH_SIZE

  while (batchCount === RETENTION_BATCH_SIZE) {
    const deletedCounters = await database
      .delete(domainWindowCounters)
      .where(
        sql`ctid in (select ctid from ${domainWindowCounters} where ${lt(domainWindowCounters.windowStart, before)} limit ${RETENTION_BATCH_SIZE})`
      )
      .returning({ windowStart: domainWindowCounters.windowStart })

    batchCount = deletedCounters.length
    deletedCount += batchCount
  }

  return deletedCount
}

async function deleteDeliveriesBefore(before: Date): Promise<number> {
  let deletedCount = 0
  let batchCount = RETENTION_BATCH_SIZE

  while (batchCount === RETENTION_BATCH_SIZE) {
    const deletedDeliveries = await database
      .delete(webhookDeliveries)
      .where(
        sql`ctid in (select ctid from ${webhookDeliveries} where ${lt(webhookDeliveries.receivedAt, before)} limit ${RETENTION_BATCH_SIZE})`
      )
      .returning({ svixId: webhookDeliveries.svixId })

    batchCount = deletedDeliveries.length
    deletedCount += batchCount
  }

  return deletedCount
}

export const webhookEventsRepository = {
  incrementCounters,
  deleteCountersBefore,
  deleteDeliveriesBefore
}
