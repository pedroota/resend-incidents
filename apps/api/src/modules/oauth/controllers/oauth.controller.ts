import { Elysia } from "elysia"
import { env } from "@api/common/env/environment"
import {
  expiredCookie,
  OAUTH_COOKIE,
  oauthCookieOptions
} from "@api/common/http/cookies"
import { auth } from "@api/modules/auth/auth.client"
import { authorizeCookieDto } from "@api/modules/oauth/dtos/authorize-cookie.dto"
import { callbackQueryDto } from "@api/modules/oauth/dtos/callback-query.dto"
import {
  CALLBACK_PATH,
  OAUTH_PREFIX
} from "@api/modules/oauth/constants/oauth.constants"
import { oauthService } from "@api/modules/oauth/services/oauth.service"

export const oauthController = new Elysia({ prefix: OAUTH_PREFIX })
  .get(
    "/authorize",
    async ({ request, cookie, redirect }) => {
      const session = await auth.api.getSession({ headers: request.headers })

      if (!session) {
        return redirect(env.WEB_URL, 303)
      }

      const { attempt, authorizationUrl } = oauthService.startAuthorization()

      cookie[OAUTH_COOKIE].set({ value: attempt, ...oauthCookieOptions })

      return redirect(authorizationUrl, 303)
    },
    { cookie: authorizeCookieDto }
  )
  .get(
    CALLBACK_PATH,
    async ({ request, query, cookie, redirect }) => {
      const attempt = cookie[OAUTH_COOKIE].value

      cookie[OAUTH_COOKIE].set(expiredCookie(oauthCookieOptions))

      const session = await auth.api.getSession({ headers: request.headers })

      if (!session) {
        return redirect(env.WEB_URL, 303)
      }

      const result = await oauthService.completeAuthorization(
        session.user.id,
        attempt,
        query
      )

      if (!result.success) {
        return redirect(
          `${env.WEB_URL}/oauth/error?reason=${result.reason}`,
          303
        )
      }

      return redirect(`${env.WEB_URL}/connected`, 303)
    },
    { query: callbackQueryDto, cookie: authorizeCookieDto }
  )
