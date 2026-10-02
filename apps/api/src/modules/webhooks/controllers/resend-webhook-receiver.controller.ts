import { Elysia } from "elysia"
import { z } from "zod"
import { RECEIVER_PREFIX } from "@api/modules/webhooks/constants/webhooks.constants"
import { svixHeadersDto } from "@api/modules/webhooks/dtos/svix-headers.dto"
import { webhookEventsService } from "@api/modules/webhooks/services/webhook-events.service"

export const resendWebhookReceiverController = new Elysia({
  prefix: RECEIVER_PREFIX
}).post(
  "/:installationId",
  async ({ params, headers, body, status }) => {
    // The signature covers the raw body, so it is read as text.
    const result = await webhookEventsService.receiveWebhookEvent(
      params.installationId,
      {
        id: headers["svix-id"],
        timestamp: headers["svix-timestamp"],
        signature: headers["svix-signature"]
      },
      body
    )

    if (result.success) {
      return { received: true as const }
    }

    return result.error === "invalid_signature"
      ? status(401, { error: result.error })
      : status(400, { error: result.error })
  },
  {
    parse: "text",
    body: z.string(),
    headers: svixHeadersDto,
    params: z.object({ installationId: z.uuid() })
  }
)
