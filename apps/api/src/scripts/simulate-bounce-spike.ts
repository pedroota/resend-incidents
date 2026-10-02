import { createHmac, randomUUID } from "node:crypto"
import { parseArgs } from "node:util"
import { eq, isNull } from "drizzle-orm"
import { tokenCipher } from "@api/common/crypto/token-cipher"
import { database } from "@api/common/database"
import { installations, resendWebhooks } from "@api/common/database/schema"
import { env } from "@api/common/env/environment"
import { jobsQueue } from "@api/common/queue/queues"
import {
  DETECTION_WINDOW_MS,
  INCIDENT_DETECTION_JOB
} from "@api/modules/incidents/constants/incidents.constants"
import { COUNTER_WINDOW_MS } from "@api/modules/webhooks/constants/webhooks.constants"
import { RECEIVER_PREFIX } from "@api/modules/webhooks/constants/webhooks.constants"

// Script to simulate a bounce spike by sending signed email event webhooks without sending real emails.
const { values } = parseArgs({
  options: {
    domain: { type: "string" },
    sent: { type: "string", default: "100" },
    bounced: { type: "string", default: "5" },
    installation: { type: "string" }
  }
})

const senderDomain = values.domain
const sentCount = Number(values.sent)
const bouncedCount = Number(values.bounced)

if (!senderDomain) {
  throw new Error("--domain is required")
}

if (!Number.isInteger(sentCount) || !Number.isInteger(bouncedCount)) {
  throw new Error("--sent and --bounced must be integers")
}

const connectedWebhooks = await database
  .select({
    installationId: resendWebhooks.installationId,
    signingSecretEncrypted: resendWebhooks.signingSecretEncrypted
  })
  .from(resendWebhooks)
  .innerJoin(installations, eq(installations.id, resendWebhooks.installationId))
  .where(isNull(installations.disconnectedAt))

const webhook = values.installation
  ? connectedWebhooks.find(
      (candidate) => candidate.installationId === values.installation
    )
  : connectedWebhooks[0]

if (!webhook) {
  throw new Error("No connected installation with a provisioned webhook")
}

const signingSecret = tokenCipher.decrypt(webhook.signingSecretEncrypted)
const signingKey = Buffer.from(signingSecret.replace(/^whsec_/, ""), "base64")
const receiverUrl = `${env.API_URL}${RECEIVER_PREFIX}/${webhook.installationId}`

async function deliver(type: "email.sent" | "email.bounced") {
  const body = JSON.stringify({
    type,
    created_at: new Date().toISOString(),
    data: { from: `Demo <alerts@${senderDomain}>` }
  })
  const svixId = `msg_sim_${randomUUID()}`
  const svixTimestamp = String(Math.floor(Date.now() / 1000))
  const signature = createHmac("sha256", signingKey)
    .update(`${svixId}.${svixTimestamp}.${body}`)
    .digest("base64")

  const response = await fetch(receiverUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": `v1,${signature}`
    },
    body
  })

  if (!response.ok) {
    throw new Error(`Receiver answered ${response.status} for ${type}`)
  }
}

await Promise.all([
  ...Array.from({ length: sentCount }, () => deliver("email.sent")),
  ...Array.from({ length: bouncedCount }, () => deliver("email.bounced"))
])

// Skips the 5 min scan: enqueues detection now. Random `jobId` so reruns in the same bucket are not deduped.
const currentBucketStart =
  Math.floor(Date.now() / COUNTER_WINDOW_MS) * COUNTER_WINDOW_MS
const since = new Date(
  currentBucketStart - DETECTION_WINDOW_MS + COUNTER_WINDOW_MS
)

await jobsQueue.enqueue(
  INCIDENT_DETECTION_JOB,
  { installationId: webhook.installationId, since: since.toISOString() },
  { jobId: `${INCIDENT_DETECTION_JOB}~sim~${randomUUID()}` }
)
await jobsQueue.close()

console.log(
  `Sent ${sentCount} sent + ${bouncedCount} bounced events for ${senderDomain} (${(
    (bouncedCount / sentCount) *
    100
  ).toFixed(1)}%). Detection enqueued now.`
)
process.exit(0)
