import { z } from "zod"

export const webhookEventTypeDto = z.object({ type: z.string() })

export const emailEventDto = z.object({
  type: z.enum(["email.sent", "email.bounced"]),
  created_at: z.iso
    .datetime({ offset: true })
    .transform((value) => new Date(value)),
  data: z.object({ from: z.string() })
})
