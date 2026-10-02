import { and, desc, eq, isNull } from "drizzle-orm"
import { database } from "@api/common/database"
import { installations } from "@api/common/database/schema"
import type {
  LockedTokensHandler,
  UpsertInstallation
} from "@api/modules/installations/types/installations.repository.types"

async function upsert(values: UpsertInstallation) {
  const [installation] = await database
    .insert(installations)
    .values(values)
    .onConflictDoUpdate({
      target: installations.teamId,
      set: { ...values, updatedAt: new Date() }
    })
    .returning({ id: installations.id })

  return installation?.id ?? null
}

async function findTokens(installationId: string) {
  const [tokens] = await database
    .select({
      accessTokenEncrypted: installations.accessTokenEncrypted,
      refreshTokenEncrypted: installations.refreshTokenEncrypted,
      accessTokenExpiresAt: installations.accessTokenExpiresAt
    })
    .from(installations)
    .where(
      and(
        eq(installations.id, installationId),
        isNull(installations.disconnectedAt)
      )
    )

  return tokens ?? null
}

async function isInstallationConnected(installationId: string) {
  const [installation] = await database
    .select({ id: installations.id })
    .from(installations)
    .where(
      and(
        eq(installations.id, installationId),
        isNull(installations.disconnectedAt)
      )
    )

  return installation !== undefined
}

// A user may have reconnected several Resend teams; the latest one is theirs.
async function findConnectedIdByUserId(userId: string) {
  const [installation] = await database
    .select({ id: installations.id })
    .from(installations)
    .where(
      and(
        eq(installations.userId, userId),
        isNull(installations.disconnectedAt)
      )
    )
    .orderBy(desc(installations.updatedAt))
    .limit(1)

  return installation?.id ?? null
}

// Row lock serializes updates per installation; waiters re-read the committed row.
async function updateTokens<T>(
  installationId: string,
  withLockedTokens: LockedTokensHandler<T>
) {
  return database.transaction(async (tx) => {
    const [tokens] = await tx
      .select({
        accessTokenEncrypted: installations.accessTokenEncrypted,
        refreshTokenEncrypted: installations.refreshTokenEncrypted,
        accessTokenExpiresAt: installations.accessTokenExpiresAt
      })
      .from(installations)
      .where(
        and(
          eq(installations.id, installationId),
          isNull(installations.disconnectedAt)
        )
      )
      .for("update")

    const { result, changes } = await withLockedTokens(tokens ?? null)

    if (changes) {
      await tx
        .update(installations)
        .set({ ...changes, updatedAt: new Date() })
        .where(eq(installations.id, installationId))
    }

    return result
  })
}

export const installationsRepository = {
  upsert,
  findTokens,
  isInstallationConnected,
  findConnectedIdByUserId,
  updateTokens
}
