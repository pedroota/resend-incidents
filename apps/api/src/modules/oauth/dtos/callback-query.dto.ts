import { z } from "zod"

export const callbackQueryDto = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional()
})

export type CallbackQuery = z.infer<typeof callbackQueryDto>
