import { and, eq, isNull } from "drizzle-orm"
import { database } from "@api/common/database"
import { installations, resendWebhooks } from "@api/common/database/schema"
import type { LockedWebhookHandler } from "@api/modules/webhooks/types/resend-webhooks.types"

async function find(installationId: string) {
  const [webhook] = await database
    .select()
    .from(resendWebhooks)
    .where(eq(resendWebhooks.installationId, installationId))

  return webhook ?? null
}

// Only connected installations receive events.
async function findSigningSecret(installationId: string) {
  const [webhook] = await database
    .select({ signingSecretEncrypted: resendWebhooks.signingSecretEncrypted })
    .from(resendWebhooks)
    .innerJoin(
      installations,
      eq(installations.id, resendWebhooks.installationId)
    )
    .where(
      and(
        eq(resendWebhooks.installationId, installationId),
        isNull(installations.disconnectedAt)
      )
    )

  return webhook?.signingSecretEncrypted ?? null
}

// Row lock on the installation serializes setup so concurrent installs create one webhook.
async function ensureLocked<T>(
  installationId: string,
  withLockedWebhook: LockedWebhookHandler<T>
) {
  return database.transaction(async (tx) => {
    await tx
      .select({ id: installations.id })
      .from(installations)
      .where(eq(installations.id, installationId))
      .for("update")

    const [stored] = await tx
      .select()
      .from(resendWebhooks)
      .where(eq(resendWebhooks.installationId, installationId))

    const { result, webhook } = await withLockedWebhook(stored ?? null)

    await tx
      .insert(resendWebhooks)
      .values({ installationId, ...webhook })
      .onConflictDoUpdate({
        target: resendWebhooks.installationId,
        set: { ...webhook, updatedAt: new Date() }
      })

    return result
  })
}

export const resendWebhooksRepository = {
  find,
  findSigningSecret,
  ensureLocked
}
