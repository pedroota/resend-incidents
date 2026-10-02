import { eq } from "drizzle-orm"
import { database } from "@api/common/database"
import { discordGuilds } from "@api/common/database/schema"
import type { UpsertDiscordGuild } from "@api/modules/discord/types/discord.types"

// Reinstalling the bot into another server replaces the previous one.
async function upsert(values: UpsertDiscordGuild) {
  await database
    .insert(discordGuilds)
    .values(values)
    .onConflictDoUpdate({
      target: discordGuilds.installationId,
      set: { ...values, updatedAt: new Date() }
    })
}

async function findByInstallation(installationId: string) {
  const [guild] = await database
    .select({ id: discordGuilds.guildId, name: discordGuilds.guildName })
    .from(discordGuilds)
    .where(eq(discordGuilds.installationId, installationId))

  return guild ?? null
}

export const discordGuildsRepository = {
  upsert,
  findByInstallation
}
