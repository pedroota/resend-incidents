import { registerEventSubscriptions } from "@api/modules/events/event-subscriptions"
import {
  EVENT_OUTBOX_RELAY_JOB,
  EVENT_OUTBOX_RETENTION_JOB
} from "@api/modules/events/constants/events.constants"
import { eventOutboxRetentionJob } from "@api/modules/events/jobs/event-outbox-retention.job"
import { eventBusService } from "@api/modules/events/services/event-bus.service"
import {
  INCIDENT_DETECTION_JOB,
  INCIDENT_DETECTION_SCAN_JOB,
  INCIDENT_ALERT_DELIVERY_JOB,
  INCIDENT_UPDATE_DELIVERY_JOB
} from "@api/modules/incidents/constants/incidents.constants"
import { incidentDetectionJob } from "@api/modules/incidents/jobs/incident-detection.job"
import { incidentDetectionScanJob } from "@api/modules/incidents/jobs/incident-detection-scan.job"
import { incidentAlertDeliveryJob } from "@api/modules/incidents/jobs/incident-alert-delivery.job"
import { incidentUpdateDeliveryJob } from "@api/modules/incidents/jobs/incident-update-delivery.job"
import { WEBHOOK_DATA_RETENTION_JOB } from "@api/modules/webhooks/constants/webhooks.constants"
import { webhookDataRetentionJob } from "@api/modules/webhooks/jobs/webhook-data-retention.job"
import type { JobQueue } from "./job-queue"
import { alertsQueue, jobsQueue } from "./queues"
import { queueSchedules } from "./schedules"

const queues: JobQueue[] = [jobsQueue, alertsQueue]

// Wired here, not in the queue module, so queues never import domain code.
function registerProcessors() {
  jobsQueue.registerProcessors({
    [EVENT_OUTBOX_RELAY_JOB]: eventBusService.relayPendingEvents,
    [INCIDENT_DETECTION_SCAN_JOB]: incidentDetectionScanJob.process,
    [INCIDENT_DETECTION_JOB]: incidentDetectionJob.process,
    [WEBHOOK_DATA_RETENTION_JOB]: webhookDataRetentionJob.process,
    [EVENT_OUTBOX_RETENTION_JOB]: eventOutboxRetentionJob.process
  })

  alertsQueue.registerProcessors({
    [INCIDENT_ALERT_DELIVERY_JOB]: incidentAlertDeliveryJob.process,
    [INCIDENT_UPDATE_DELIVERY_JOB]: incidentUpdateDeliveryJob.process
  })
}

// Idempotent: upsert reconciles each schedule on every boot.
async function registerSchedulers() {
  await Promise.all(
    queueSchedules.map((schedule) =>
      schedule.queue.upsertScheduler(
        schedule.schedulerId,
        schedule.repeat,
        schedule.jobName
      )
    )
  )
}

export async function startQueue() {
  registerProcessors()
  registerEventSubscriptions()
  await registerSchedulers()

  for (const queue of queues) {
    queue.startWorker()
  }
}

export async function stopQueue() {
  await Promise.all(queues.map((queue) => queue.close()))
}
