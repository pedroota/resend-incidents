import { z } from "zod"

export const discordTokenResponseDto = z.object({
  guild: z.object({ id: z.string(), name: z.string() }).optional()
})

export const discordErrorResponseDto = z.object({ code: z.number() })

export const discordChannelsResponseDto = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    type: z.number(),
    position: z.number()
  })
)

export const discordMessageResponseDto = z.object({ id: z.string() })
