import { z } from "zod"
import { DISCORD_OAUTH_COOKIE } from "@api/common/http/cookies"

export const discordAuthorizeCookieDto = z.object({
  [DISCORD_OAUTH_COOKIE]: z.string().optional()
})
