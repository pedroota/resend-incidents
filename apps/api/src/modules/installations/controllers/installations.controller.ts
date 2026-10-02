import { Elysia } from "elysia"
import { betterAuth } from "@api/modules/auth/auth.macro"
import { installationsService } from "@api/modules/installations/services/installations.service"

export const installationsController = new Elysia({
  prefix: "/installations"
})
  .use(betterAuth)
  .get(
    "/me/domains",
    async ({ installationId, status }) => {
      const result = await installationsService.listDomains(installationId)

      if (result.success) {
        return { domains: result.domains }
      }

      return result.error === "not_connected"
        ? status(401, { error: result.error })
        : status(502, { error: result.error })
    },
    { installation: true }
  )
