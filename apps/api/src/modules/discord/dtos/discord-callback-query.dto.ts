import { z } from "zod"

export const discordCallbackQueryDto = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional()
})

export type DiscordCallbackQuery = z.infer<typeof discordCallbackQueryDto>
