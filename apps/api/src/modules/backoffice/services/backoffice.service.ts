import { randomUUID } from "node:crypto"
import { logger } from "@api/common/logger/client"
import { jobsQueue } from "@api/common/queue/queues"
import type {
  SimulateBounceSpikeInput,
  SimulateBounceSpikeResult
} from "@api/modules/backoffice/types/backoffice.types"
import {
  DETECTION_WINDOW_MS,
  INCIDENT_DETECTION_JOB
} from "@api/modules/incidents/constants/incidents.constants"
import { incidentsRepository } from "@api/modules/incidents/repositories/incidents.repository"
import { COUNTER_WINDOW_MS } from "@api/modules/webhooks/constants/webhooks.constants"
import { webhookEventsRepository } from "@api/modules/webhooks/repositories/webhook-events.repository"

// Counts synthetic sent/bounced events in the current bucket, as the receiver would, without sending real emails.
async function simulateBounceSpike(
  input: SimulateBounceSpikeInput
): Promise<SimulateBounceSpikeResult> {
  const connectedInstallationIds =
    await incidentsRepository.listConnectedInstallationIds()

  const installationId = input.installationId
    ? connectedInstallationIds.find(
        (connectedId) => connectedId === input.installationId
      )
    : connectedInstallationIds[0]

  if (!installationId) {
    return { success: false, error: "installation_not_found" }
  }

  const currentBucketStart =
    Math.floor(Date.now() / COUNTER_WINDOW_MS) * COUNTER_WINDOW_MS
  const windowStart = new Date(currentBucketStart)

  await Promise.all([
    ...Array.from({ length: input.sent }, () =>
      webhookEventsRepository.incrementCounters(
        {
          installationId,
          svixId: `msg_sim_${randomUUID()}`,
          domain: input.domain,
          counter: "sent"
        },
        windowStart
      )
    ),
    ...Array.from({ length: input.bounced }, () =>
      webhookEventsRepository.incrementCounters(
        {
          installationId,
          svixId: `msg_sim_${randomUUID()}`,
          domain: input.domain,
          counter: "bounced"
        },
        windowStart
      )
    )
  ])

  // Skips the 5 min scan: enqueues detection now. Random `jobId` so reruns in the same bucket are not deduped.
  const since = new Date(
    currentBucketStart - DETECTION_WINDOW_MS + COUNTER_WINDOW_MS
  )

  await jobsQueue.enqueue(
    INCIDENT_DETECTION_JOB,
    { installationId, since: since.toISOString() },
    { jobId: `${INCIDENT_DETECTION_JOB}~sim~${randomUUID()}` }
  )

  logger.info("Bounce spike simulated", {
    installationId,
    domain: input.domain,
    sent: input.sent,
    bounced: input.bounced
  })

  return {
    success: true,
    installationId,
    domain: input.domain,
    sent: input.sent,
    bounced: input.bounced
  }
}

export const backofficeService = {
  simulateBounceSpike
}
