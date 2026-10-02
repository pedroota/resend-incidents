import { env } from "@api/common/env/environment"
import { parseJson } from "@api/common/json/parse-json"
import { logger } from "@api/common/logger/client"
import {
  tokenErrorResponseDto,
  tokenResponseDto
} from "../dtos/token-response.dto"
import { teamIdFromAccessToken } from "../services/access-token.service"
import type { ExchangeCodeResult, RefreshTokensResult } from "../types"

const TOKEN_REQUEST_TIMEOUT_MS = 10_000

// OAuth calls aren't made with a team's access token, so they don't go through the team request gate.
class ResendOAuthClient {
  constructor(
    private readonly baseUrl: string,
    private readonly clientId: string
  ) {}

  authorizationUrl(
    redirectUri: string,
    state: string,
    codeChallenge: string
  ): string {
    const url = new URL("/oauth/authorize", this.baseUrl)
    url.search = new URLSearchParams({
      client_id: this.clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: "full_access",
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256"
    }).toString()
    return url.toString()
  }

  async exchangeCode(
    code: string,
    codeVerifier: string,
    redirectUri: string
  ): Promise<ExchangeCodeResult> {
    const response = await fetch(new URL("/oauth/token", this.baseUrl), {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: this.clientId,
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier
      })
    })

    const responseStatus = response.status
    const responseText = await response.text()

    if (!response.ok) {
      logger.error(`Resend token exchange failed with ${responseStatus}`, {
        statusCode: responseStatus,
        responseText
      })
      return {
        success: false,
        error: new Error(`Resend token exchange failed with ${responseStatus}`)
      }
    }

    const parsed = parseJson(responseText, tokenResponseDto)

    if (!parsed.success) {
      logger.error("Resend token exchange returned an invalid body", {
        statusCode: responseStatus,
        responseText,
        error: parsed.error
      })
      return { success: false, error: parsed.error }
    }

    const tokens = parsed.data
    const teamId = teamIdFromAccessToken(tokens.access_token)

    if (!teamId.success) {
      return { success: false, error: teamId.error }
    }

    return {
      success: true,
      tokens: {
        teamId: teamId.teamId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresInSeconds: tokens.expires_in,
        scope: tokens.scope
      }
    }
  }

  async refreshTokens(refreshToken: string): Promise<RefreshTokensResult> {
    let response: Response
    try {
      response = await fetch(new URL("/oauth/token", this.baseUrl), {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: this.clientId,
          refresh_token: refreshToken
        }),
        signal: AbortSignal.timeout(TOKEN_REQUEST_TIMEOUT_MS)
      })
    } catch (error) {
      logger.error("Resend token refresh request failed", { error })
      return { success: false, reason: "unavailable" }
    }

    const responseStatus = response.status
    const responseText = await response.text()

    if (!response.ok) {
      logger.error(`Resend token refresh failed with ${responseStatus}`, {
        statusCode: responseStatus,
        responseText
      })
      // Only invalid_grant means the grant is dead; invalid_client is our config.
      const error = parseJson(responseText, tokenErrorResponseDto)

      const grantRejected =
        responseStatus === 400 &&
        error.success &&
        error.data.error === "invalid_grant"

      return {
        success: false,
        reason: grantRejected ? "rejected" : "unavailable"
      }
    }

    const parsed = parseJson(responseText, tokenResponseDto)

    if (!parsed.success) {
      logger.error("Resend token refresh returned an invalid body", {
        statusCode: responseStatus,
        responseText,
        error: parsed.error
      })
      return { success: false, reason: "unavailable" }
    }

    const tokens = parsed.data
    const teamId = teamIdFromAccessToken(tokens.access_token)

    if (!teamId.success) {
      logger.error("Resend refreshed access token has no team", {
        error: teamId.error
      })
      return { success: false, reason: "unavailable" }
    }

    return {
      success: true,
      tokens: {
        teamId: teamId.teamId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresInSeconds: tokens.expires_in,
        scope: tokens.scope
      }
    }
  }
}

export const resendOAuthClient = new ResendOAuthClient(
  env.RESEND_API_URL,
  env.RESEND_CLIENT_ID
)
