// Drains the outbox into the queue; also kicked right after each publish.
export const EVENT_OUTBOX_RELAY_JOB = "event-outbox.relay"

export const EVENT_OUTBOX_RELAY_INTERVAL_MS = 10_000

// Rows drained per relay tick.
export const RELAY_BATCH_SIZE = 100

export const EVENT_OUTBOX_RETENTION_JOB = "event-outbox.retention"
export const EVENT_OUTBOX_RETENTION_INTERVAL_MS = 60 * 60_000
// Rows per retention delete, so no single statement holds long locks.
export const RETENTION_BATCH_SIZE = 5000

// Processed rows only keep `dedupeKey` taken; keys are never reused this late.
export const PROCESSED_EVENT_RETENTION_MS = 7 * 24 * 60 * 60_000
