import { and, asc, eq } from "drizzle-orm"
import { database } from "@api/common/database"
import { destinations } from "@api/common/database/schema"
import type { UpsertDestination } from "@api/modules/destinations/types/destinations.repository.types"

async function list(installationId: string) {
  return database
    .select()
    .from(destinations)
    .where(eq(destinations.installationId, installationId))
    .orderBy(asc(destinations.createdAt))
}

async function find(installationId: string, destinationId: string) {
  const [destination] = await database
    .select()
    .from(destinations)
    .where(
      and(
        eq(destinations.id, destinationId),
        eq(destinations.installationId, installationId)
      )
    )

  return destination ?? null
}

async function listIds(installationId: string) {
  const installationDestinations = await database
    .select({ id: destinations.id })
    .from(destinations)
    .where(eq(destinations.installationId, installationId))

  return installationDestinations.map(({ id }) => id)
}

async function upsert(values: UpsertDestination) {
  const [destination] = await database
    .insert(destinations)
    .values(values)
    .onConflictDoUpdate({
      target: [destinations.installationId, destinations.channelId],
      set: { name: values.name, updatedAt: new Date() }
    })
    .returning()

  return destination ?? null
}

export const destinationsRepository = {
  list,
  find,
  listIds,
  upsert
}
