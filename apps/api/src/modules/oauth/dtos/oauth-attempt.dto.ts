import { z } from "zod"

export const oauthAttemptDto = z.object({
  state: z.string(),
  codeVerifier: z.string()
})

export type OAuthAttempt = z.infer<typeof oauthAttemptDto>
