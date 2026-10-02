import { logger } from "@api/common/logger/client"
import { jobsQueue } from "@api/common/queue/queues"
import {
  INCIDENT_DETECTION_JOB,
  DETECTION_WINDOW_MS
} from "@api/modules/incidents/constants/incidents.constants"
import { incidentsRepository } from "@api/modules/incidents/repositories/incidents.repository"
import { COUNTER_WINDOW_MS } from "@api/modules/webhooks/constants/webhooks.constants"

// Scheduled every 5 minutes; the `jobId` dedupes a tick enqueued twice.
async function process() {
  // The 1h window is the current counter bucket plus the 11 before it.
  const currentBucketStart =
    Math.floor(Date.now() / COUNTER_WINDOW_MS) * COUNTER_WINDOW_MS
  const since = new Date(
    currentBucketStart - DETECTION_WINDOW_MS + COUNTER_WINDOW_MS
  )

  const installationIds =
    await incidentsRepository.listConnectedInstallationIds()

  await jobsQueue.enqueueBulk(
    installationIds.map((installationId) => ({
      name: INCIDENT_DETECTION_JOB,
      data: { installationId, since: since.toISOString() },
      opts: {
        jobId: `${INCIDENT_DETECTION_JOB}~${installationId}~${since.getTime()}`
      }
    }))
  )

  if (installationIds.length > 0) {
    logger.info("Incident detection enqueued", {
      installationCount: installationIds.length
    })
  }
}

export const incidentDetectionScanJob = {
  process
}
