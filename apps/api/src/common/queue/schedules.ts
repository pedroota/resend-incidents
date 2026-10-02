import type { RepeatOptions } from "bullmq"
import {
  EVENT_OUTBOX_RELAY_INTERVAL_MS,
  EVENT_OUTBOX_RELAY_JOB,
  EVENT_OUTBOX_RETENTION_INTERVAL_MS,
  EVENT_OUTBOX_RETENTION_JOB
} from "@api/modules/events/constants/events.constants"
import {
  INCIDENT_DETECTION_SCAN_JOB,
  DETECTION_INTERVAL_MS
} from "@api/modules/incidents/constants/incidents.constants"
import {
  WEBHOOK_DATA_RETENTION_INTERVAL_MS,
  WEBHOOK_DATA_RETENTION_JOB
} from "@api/modules/webhooks/constants/webhooks.constants"
import type { JobQueue } from "./job-queue"
import { jobsQueue } from "./queues"

interface QueueSchedule {
  schedulerId: string
  queue: JobQueue
  repeat: RepeatOptions
  jobName: string
}

// BullMQ runs each schedule once across all replicas.
export const queueSchedules: QueueSchedule[] = [
  {
    schedulerId: "event-outbox-relay",
    queue: jobsQueue,
    repeat: { every: EVENT_OUTBOX_RELAY_INTERVAL_MS },
    jobName: EVENT_OUTBOX_RELAY_JOB
  },
  {
    schedulerId: "incident-detection-scan",
    queue: jobsQueue,
    repeat: { every: DETECTION_INTERVAL_MS },
    jobName: INCIDENT_DETECTION_SCAN_JOB
  },
  {
    schedulerId: "webhook-data-retention",
    queue: jobsQueue,
    repeat: { every: WEBHOOK_DATA_RETENTION_INTERVAL_MS },
    jobName: WEBHOOK_DATA_RETENTION_JOB
  },
  {
    schedulerId: "event-outbox-retention",
    queue: jobsQueue,
    repeat: { every: EVENT_OUTBOX_RETENTION_INTERVAL_MS },
    jobName: EVENT_OUTBOX_RETENTION_JOB
  }
]
