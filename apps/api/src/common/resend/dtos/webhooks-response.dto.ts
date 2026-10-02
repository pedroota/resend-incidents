import { z } from "zod"

export const webhookStatusDto = z.enum(["enabled", "disabled"])

export const webhooksResponseDto = z.object({
  data: z.array(
    z.object({ id: z.string(), endpoint: z.string(), status: webhookStatusDto })
  )
})

export const webhookResponseDto = z.object({
  id: z.string(),
  status: webhookStatusDto,
  signing_secret: z.string()
})

export const createWebhookResponseDto = z.object({
  id: z.string(),
  signing_secret: z.string()
})
