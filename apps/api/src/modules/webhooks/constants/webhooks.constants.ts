import type { ResendWebhookEventType } from "@api/common/resend/types"

export const RECEIVER_PREFIX = "/webhooks/resend"

export const WEBHOOK_EVENTS = [
  "email.sent",
  "email.bounced"
] as const satisfies readonly ResendWebhookEventType[]

// The rule sums these buckets into its 1h window.
export const COUNTER_WINDOW_MS = 5 * 60_000

export const SIGNATURE_TOLERANCE_SECONDS = 5 * 60

export const HANDLED_EVENT_TYPES = new Set<string>(WEBHOOK_EVENTS)

export const WEBHOOK_DATA_RETENTION_JOB = "webhook-data.retention"
export const WEBHOOK_DATA_RETENTION_INTERVAL_MS = 60 * 60_000
// Rows per retention delete, so no single statement holds long locks.
export const RETENTION_BATCH_SIZE = 5000

// Detection reads 1h windows; an incident open longer than this loses its oldest counts in the summary.
export const COUNTER_RETENTION_MS = 8 * 24 * 60 * 60_000
// Svix stops retrying a message well before this.
export const DELIVERY_RETENTION_MS = 8 * 24 * 60 * 60_000
