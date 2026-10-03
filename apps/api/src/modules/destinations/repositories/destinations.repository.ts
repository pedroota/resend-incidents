import { and, asc, eq, ne } from "drizzle-orm"
import { database } from "@api/common/database"
import { destinations, installations } from "@api/common/database/schema"
import type { ReplaceDestination } from "@api/modules/destinations/types/destinations.repository.types"

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

// Ensures each installation has a single destination, deleting others and serializing concurrent updates with a row lock.
async function replace(values: ReplaceDestination) {
  return database.transaction(async (tx) => {
    await tx
      .select({ id: installations.id })
      .from(installations)
      .where(eq(installations.id, values.installationId))
      .for("update")

    await tx
      .delete(destinations)
      .where(
        and(
          eq(destinations.installationId, values.installationId),
          ne(destinations.channelId, values.channelId)
        )
      )

    const [destination] = await tx
      .insert(destinations)
      .values(values)
      .onConflictDoUpdate({
        target: [destinations.installationId, destinations.channelId],
        set: { name: values.name, updatedAt: new Date() }
      })
      .returning()

    return destination ?? null
  })
}

export const destinationsRepository = {
  list,
  find,
  listIds,
  replace
}
