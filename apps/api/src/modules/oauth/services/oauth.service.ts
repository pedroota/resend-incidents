import { statesMatch } from "@api/common/crypto/states-match"
import { env } from "@api/common/env/environment"
import { logger } from "@api/common/logger/client"
import { resendOAuthClient } from "@api/common/resend/clients/resend-oauth.client"
import { installationsService } from "@api/modules/installations/services/installations.service"
import { resendWebhooksService } from "@api/modules/webhooks/services/resend-webhooks.service"
import type { CallbackQuery } from "@api/modules/oauth/dtos/callback-query.dto"
import type { OAuthAttempt } from "@api/modules/oauth/dtos/oauth-attempt.dto"
import {
  CALLBACK_PATH,
  OAUTH_PREFIX
} from "@api/modules/oauth/constants/oauth.constants"
import {
  createCodeChallenge,
  createCodeVerifier,
  createState
} from "@api/modules/oauth/services/pkce.service"

export type OAuthErrorReason = "access_denied" | "invalid_state" | "unknown"

export type CompleteAuthorizationResult =
  | { success: true }
  | { success: false; reason: OAuthErrorReason }

const REDIRECT_URI = `${env.API_URL}${OAUTH_PREFIX}${CALLBACK_PATH}`

function startAuthorization() {
  const state = createState()
  const codeVerifier = createCodeVerifier()

  return {
    attempt: { state, codeVerifier } satisfies OAuthAttempt,
    authorizationUrl: resendOAuthClient.authorizationUrl(
      REDIRECT_URI,
      state,
      createCodeChallenge(codeVerifier)
    )
  }
}

async function completeAuthorization(
  userId: string,
  attempt: OAuthAttempt | undefined,
  query: CallbackQuery
): Promise<CompleteAuthorizationResult> {
  if (query.error === "access_denied") {
    return { success: false, reason: "access_denied" }
  }

  if (!attempt || !query.state || !statesMatch(attempt.state, query.state)) {
    return { success: false, reason: "invalid_state" }
  }

  if (query.error || !query.code) {
    logger.warn("Resend OAuth callback without code", { error: query.error })
    return { success: false, reason: "unknown" }
  }

  try {
    const exchange = await resendOAuthClient.exchangeCode(
      query.code,
      attempt.codeVerifier,
      REDIRECT_URI
    )

    if (!exchange.success) {
      logger.error("Resend token exchange failed", { error: exchange.error })
      return { success: false, reason: "unknown" }
    }

    const installationId = await installationsService.connect(
      userId,
      exchange.tokens
    )

    logger.info("Resend installation connected", { installationId })

    await resendWebhooksService.provisionWebhook(installationId)

    return { success: true }
  } catch (error) {
    logger.error("Resend OAuth callback failed", { error })
    return { success: false, reason: "unknown" }
  }
}

export const oauthService = {
  startAuthorization,
  completeAuthorization
}
