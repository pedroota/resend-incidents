import { Elysia } from "elysia"
import { env } from "@api/common/env/environment"
import {
  DISCORD_OAUTH_COOKIE,
  discordOauthCookieOptions,
  expiredCookie
} from "@api/common/http/cookies"
import { auth } from "@api/modules/auth/auth.client"
import {
  DISCORD_CALLBACK_PATH,
  DISCORD_OAUTH_PREFIX
} from "@api/modules/discord/constants/discord-oauth.constants"
import { discordAuthorizeCookieDto } from "@api/modules/discord/dtos/discord-authorize-cookie.dto"
import { discordCallbackQueryDto } from "@api/modules/discord/dtos/discord-callback-query.dto"
import { discordOauthService } from "@api/modules/discord/services/discord-oauth.service"
import { installationsRepository } from "@api/modules/installations/repositories/installations.repository"

export const discordOauthController = new Elysia({
  prefix: DISCORD_OAUTH_PREFIX
})
  .get(
    "/authorize",
    async ({ request, cookie, redirect }) => {
      const session = await auth.api.getSession({ headers: request.headers })

      if (!session) {
        return redirect(env.WEB_URL, 303)
      }

      const installationId =
        await installationsRepository.findConnectedIdByUserId(session.user.id)

      if (!installationId) {
        return redirect(
          `${env.WEB_URL}/discord/error?reason=not_connected`,
          303
        )
      }

      const { state, authorizationUrl } =
        discordOauthService.startAuthorization()

      cookie[DISCORD_OAUTH_COOKIE].set({
        value: state,
        ...discordOauthCookieOptions
      })

      return redirect(authorizationUrl, 303)
    },
    { cookie: discordAuthorizeCookieDto }
  )
  .get(
    DISCORD_CALLBACK_PATH,
    async ({ request, query, cookie, redirect }) => {
      const expectedState = cookie[DISCORD_OAUTH_COOKIE].value

      cookie[DISCORD_OAUTH_COOKIE].set(expiredCookie(discordOauthCookieOptions))

      const session = await auth.api.getSession({ headers: request.headers })

      if (!session) {
        return redirect(env.WEB_URL, 303)
      }

      const installationId =
        await installationsRepository.findConnectedIdByUserId(session.user.id)

      const result = await discordOauthService.completeAuthorization(
        installationId,
        expectedState,
        query
      )

      if (!result.success) {
        return redirect(
          `${env.WEB_URL}/discord/error?reason=${result.reason}`,
          303
        )
      }

      return redirect(`${env.WEB_URL}/discord/channels`, 303)
    },
    { query: discordCallbackQueryDto, cookie: discordAuthorizeCookieDto }
  )
