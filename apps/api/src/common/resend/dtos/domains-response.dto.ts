import { z } from "zod"

export const domainsResponseDto = z.object({
  data: z.array(
    z.object({ id: z.string(), name: z.string(), status: z.string() })
  )
})
