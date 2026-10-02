import { z } from "zod"

export const svixHeadersDto = z.object({
  "svix-id": z.string().optional(),
  "svix-timestamp": z.string().optional(),
  "svix-signature": z.string().optional()
})
