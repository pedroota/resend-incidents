import { tokenCipher } from "@api/common/crypto/token-cipher"
import { logger } from "@api/common/logger/client"
import { resendOAuthClient } from "@api/common/resend/clients/resend-oauth.client"
import { installationsRepository } from "@api/modules/installations/repositories/installations.repository"
import type { InstallationTokens } from "@api/modules/installations/types/installations.repository.types"
import type {
  AccessTokenResult,
  LockedAccessTokenResult
} from "@api/modules/installations/types/installations.types"

const EXPIRY_MARGIN_MS = 60_000

const isAccessTokenValid = (tokens: InstallationTokens) => {
  return tokens.accessTokenExpiresAt.getTime() - EXPIRY_MARGIN_MS > Date.now()
}

async function accessToken(installationId: string): Promise<AccessTokenResult> {
  const cached = await installationsRepository.findTokens(installationId)

  if (!cached) {
    return { success: false, error: "not_connected" }
  }

  if (isAccessTokenValid(cached)) {
    return {
      success: true,
      accessToken: tokenCipher.decrypt(cached.accessTokenEncrypted)
    }
  }

  const result =
    await installationsRepository.updateTokens<LockedAccessTokenResult>(
      installationId,
      async (tokens) => {
        if (!tokens) {
          return {
            result: { success: false, error: "not_connected" },
            changes: null
          }
        }

        // Another process refreshed while we waited for the lock.
        if (isAccessTokenValid(tokens)) {
          return {
            result: {
              success: true,
              accessToken: tokenCipher.decrypt(tokens.accessTokenEncrypted)
            },
            changes: null
          }
        }

        const refresh = await resendOAuthClient.refreshTokens(
          tokenCipher.decrypt(tokens.refreshTokenEncrypted)
        )

        if (!refresh.success && refresh.reason === "unavailable") {
          return {
            result: { success: false, error: "resend_unavailable" },
            changes: null
          }
        }

        if (!refresh.success) {
          return {
            result: { success: false, error: "grant_rejected" },
            changes: { disconnectedAt: new Date() }
          }
        }

        const { accessToken, refreshToken, expiresInSeconds, scope } =
          refresh.tokens

        return {
          result: { success: true, accessToken },
          changes: {
            accessTokenEncrypted: tokenCipher.encrypt(accessToken),
            refreshTokenEncrypted: tokenCipher.encrypt(refreshToken),
            accessTokenExpiresAt: new Date(
              Date.now() + expiresInSeconds * 1000
            ),
            scope
          }
        }
      }
    )

  // Logged only after the disconnect is committed.
  if (!result.success && result.error === "grant_rejected") {
    logger.warn("Resend refresh rejected; installation disconnected", {
      installationId
    })
    return { success: false, error: "not_connected" }
  }

  return result
}

export const resendAccessService = {
  accessToken
}
