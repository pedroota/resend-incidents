import { Elysia } from "elysia"
import { z } from "zod"
import { betterAuth } from "@api/modules/auth/auth.macro"
import { destinationsService } from "@api/modules/destinations/services/destinations.service"

export const destinationsController = new Elysia({
  prefix: "/installations/me/destinations"
})
  .use(betterAuth)
  .get(
    "/",
    async ({ installationId, status }) => {
      const result = await destinationsService.list(installationId)

      if (!result.success) {
        return status(401, { error: result.error })
      }

      return { destinations: result.destinations }
    },
    { installation: true }
  )
  .post(
    "/discord",
    async ({ body, installationId, status }) => {
      const result = await destinationsService.addDiscord(
        installationId,
        body.channelId
      )

      if (result.success) {
        return { destination: result.destination }
      }

      switch (result.error) {
        case "not_connected":
          return status(401, { error: result.error })
        case "discord_not_installed":
          return status(404, { error: result.error })
        case "bot_not_in_server":
        case "channel_not_found":
          return status(422, { error: result.error })
        case "discord_unavailable":
          return status(502, { error: result.error })
      }
    },
    {
      installation: true,
      body: z.object({ channelId: z.string().min(1) })
    }
  )
