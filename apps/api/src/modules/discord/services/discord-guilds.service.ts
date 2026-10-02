import { discordClient } from "@api/common/discord/client"
import { discordGuildsRepository } from "@api/modules/discord/repositories/discord-guilds.repository"
import type { ListGuildChannelsResult } from "@api/modules/discord/types/discord.types"
import { installationsRepository } from "@api/modules/installations/repositories/installations.repository"

async function listChannels(
  installationId: string
): Promise<ListGuildChannelsResult> {
  const isConnected =
    await installationsRepository.isInstallationConnected(installationId)

  if (!isConnected) {
    return { success: false, error: "not_connected" }
  }

  const guild = await discordGuildsRepository.findByInstallation(installationId)

  if (!guild) {
    return { success: false, error: "discord_not_installed" }
  }

  const result = await discordClient.listTextChannels(guild.id)

  if (result.success) {
    return { success: true, guild, channels: result.channels }
  }

  // Discord answers these when the bot was kicked from the server.
  if (result.error === "unknown_guild" || result.error === "missing_access") {
    return { success: false, error: "bot_not_in_server" }
  }

  return { success: false, error: "discord_unavailable" }
}

export const discordGuildsService = {
  listChannels
}
