import { Elysia } from "elysia"
import { betterAuth } from "@api/modules/auth/auth.macro"
import { resendWebhooksService } from "@api/modules/webhooks/services/resend-webhooks.service"

export const installationWebhookController = new Elysia({
  prefix: "/installations/me/webhook"
})
  .use(betterAuth)
  .get(
    "/",
    async ({ installationId, status }) => {
      const result =
        await resendWebhooksService.getWebhookStatus(installationId)

      if (result.success) {
        return { status: result.status }
      }

      return result.error === "not_connected"
        ? status(401, { error: result.error })
        : status(502, { error: result.error })
    },
    { installation: true }
  )
  .post(
    "/",
    async ({ installationId, status }) => {
      const result =
        await resendWebhooksService.provisionWebhook(installationId)

      if (result.success) {
        return { status: result.status }
      }

      return result.error === "not_connected"
        ? status(401, { error: result.error })
        : status(502, { error: result.error })
    },
    { installation: true }
  )
