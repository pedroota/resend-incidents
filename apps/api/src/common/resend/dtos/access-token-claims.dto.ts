import { z } from "zod"

// Resend does not document a team claim yet; fall back to `sub`.
export const accessTokenClaimsDto = z.object({
  team_id: z.string().optional(),
  sub: z.string()
})
