import { z } from "zod"

export const simulateBounceSpikeDto = z.object({
  domain: z.string().min(1).toLowerCase(),
  sent: z.number().int().min(1).max(10_000).default(100),
  bounced: z.number().int().min(0).max(10_000).default(5),
  installationId: z.uuid().optional()
})

export const backofficeHeadersDto = z.object({
  "x-api-key": z.string().optional()
})
