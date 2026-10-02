import { statesMatch } from "@api/common/crypto/states-match"
import { discordClient } from "@api/common/discord/client"
import { env } from "@api/common/env/environment"
import { logger } from "@api/common/logger/client"
import {
  DISCORD_CALLBACK_PATH,
  DISCORD_OAUTH_PREFIX
} from "@api/modules/discord/constants/discord-oauth.constants"
import type { DiscordCallbackQuery } from "@api/modules/discord/dtos/discord-callback-query.dto"
import { discordGuildsRepository } from "@api/modules/discord/repositories/discord-guilds.repository"
import type { CompleteDiscordAuthorizationResult } from "@api/modules/discord/types/discord.types"
import { installationsRepository } from "@api/modules/installations/repositories/installations.repository"
import { createState } from "@api/modules/oauth/services/pkce.service"

const REDIRECT_URI = `${env.API_URL}${DISCORD_OAUTH_PREFIX}${DISCORD_CALLBACK_PATH}`

function startAuthorization() {
  const state = createState()

  return {
    state,
    authorizationUrl: discordClient.botAuthorizationUrl(REDIRECT_URI, state)
  }
}

async function completeAuthorization(
  installationId: string | null,
  expectedState: string | undefined,
  query: DiscordCallbackQuery
): Promise<CompleteDiscordAuthorizationResult> {
  if (query.error === "access_denied") {
    return { success: false, reason: "access_denied" }
  }

  if (
    !expectedState ||
    !query.state ||
    !statesMatch(expectedState, query.state)
  ) {
    return { success: false, reason: "invalid_state" }
  }

  if (!installationId) {
    return { success: false, reason: "not_connected" }
  }

  if (query.error || !query.code) {
    logger.warn("Discord OAuth callback without code", { error: query.error })
    return { success: false, reason: "unknown" }
  }

  try {
    const isConnected =
      await installationsRepository.isInstallationConnected(installationId)

    if (!isConnected) {
      return { success: false, reason: "not_connected" }
    }

    const exchange = await discordClient.exchangeCode(query.code, REDIRECT_URI)

    if (!exchange.success) {
      logger.error("Discord token exchange failed", { error: exchange.error })
      return { success: false, reason: "unknown" }
    }

    await discordGuildsRepository.upsert({
      installationId,
      guildId: exchange.guild.id,
      guildName: exchange.guild.name
    })

    logger.info("Discord bot installed", {
      installationId,
      guildId: exchange.guild.id
    })

    return { success: true }
  } catch (error) {
    logger.error("Discord OAuth callback failed", { error })
    return { success: false, reason: "unknown" }
  }
}

export const discordOauthService = {
  startAuthorization,
  completeAuthorization
}
