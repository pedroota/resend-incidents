import { asc, eq, isNull, lt, sql } from "drizzle-orm"
import { database } from "@api/common/database"
import { RETENTION_BATCH_SIZE } from "@api/modules/events/constants/events.constants"
import { eventOutbox } from "@api/common/database/schema"

// Oldest first, so a backlog drains in order.
async function listPending(limit: number) {
  return database
    .select()
    .from(eventOutbox)
    .where(isNull(eventOutbox.processedAt))
    .orderBy(asc(eventOutbox.createdAt))
    .limit(limit)
}

// Only after every subscriber job is enqueued; marking first would lose the event.
async function markProcessed(id: string) {
  await database
    .update(eventOutbox)
    .set({ processedAt: new Date() })
    .where(eq(eventOutbox.id, id))
}

// Batched by `ctid`; `processedAt` is null while pending, so pending events never expire.
async function deleteProcessedBefore(before: Date): Promise<number> {
  let deletedCount = 0
  let batchCount = RETENTION_BATCH_SIZE

  while (batchCount === RETENTION_BATCH_SIZE) {
    const deletedEvents = await database
      .delete(eventOutbox)
      .where(
        sql`ctid in (select ctid from ${eventOutbox} where ${lt(eventOutbox.processedAt, before)} limit ${RETENTION_BATCH_SIZE})`
      )
      .returning({ id: eventOutbox.id })

    batchCount = deletedEvents.length
    deletedCount += batchCount
  }

  return deletedCount
}

export const outboxRepository = {
  listPending,
  markProcessed,
  deleteProcessedBefore
}
