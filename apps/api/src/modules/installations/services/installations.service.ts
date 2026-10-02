import { tokenCipher } from "@api/common/crypto/token-cipher"
import { logger } from "@api/common/logger/client"
import { resendApiClient } from "@api/common/resend/clients/resend-api.client"
import type { ResendTokens } from "@api/common/resend/types"
import { installationsRepository } from "@api/modules/installations/repositories/installations.repository"
import { resendAccessService } from "@api/modules/installations/services/resend-access.service"
import type { ListDomainsResult } from "@api/modules/installations/types/installations.types"

async function connect(userId: string, tokens: ResendTokens): Promise<string> {
  const installationId = await installationsRepository.upsert({
    userId,
    teamId: tokens.teamId,
    accessTokenEncrypted: tokenCipher.encrypt(tokens.accessToken),
    refreshTokenEncrypted: tokenCipher.encrypt(tokens.refreshToken),
    accessTokenExpiresAt: new Date(Date.now() + tokens.expiresInSeconds * 1000),
    scope: tokens.scope,
    disconnectedAt: null
  })

  if (!installationId) {
    throw new Error("Installation upsert returned no data")
  }

  return installationId
}

async function listDomains(installationId: string): Promise<ListDomainsResult> {
  const token = await resendAccessService.accessToken(installationId)

  if (!token.success) {
    return token
  }

  try {
    const domains = await resendApiClient.listDomains(token.accessToken)
    return { success: true, domains }
  } catch (error) {
    logger.error("Resend list domains failed", { installationId, error })
    return { success: false, error: "resend_unavailable" }
  }
}

export const installationsService = {
  connect,
  listDomains
}
