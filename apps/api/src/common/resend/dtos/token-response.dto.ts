import { z } from "zod"

export const tokenResponseDto = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  scope: z.string()
})

export const tokenErrorResponseDto = z.object({ error: z.string() })
