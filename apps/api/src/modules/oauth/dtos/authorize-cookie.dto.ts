import { z } from "zod"
import { OAUTH_COOKIE } from "@api/common/http/cookies"
import { oauthAttemptDto } from "./oauth-attempt.dto"

export const authorizeCookieDto = z.object({
  [OAUTH_COOKIE]: oauthAttemptDto.optional()
})
