import { Elysia } from "elysia"
import { betterAuth } from "@api/modules/auth/auth.macro"
import { discordGuildsService } from "@api/modules/discord/services/discord-guilds.service"

export const discordController = new Elysia({
  prefix: "/installations/me/discord"
})
  .use(betterAuth)
  .get(
    "/channels",
    async ({ installationId, status }) => {
      const result = await discordGuildsService.listChannels(installationId)

      if (result.success) {
        return { guild: result.guild, channels: result.channels }
      }

      switch (result.error) {
        case "not_connected":
          return status(401, { error: result.error })
        case "discord_not_installed":
          return status(404, { error: result.error })
        case "bot_not_in_server":
          return status(409, { error: result.error })
        case "discord_unavailable":
          return status(502, { error: result.error })
      }
    },
    { installation: true }
  )
