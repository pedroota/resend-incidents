import { env } from "@api/common/env/environment"
import { parseJson } from "@api/common/json/parse-json"
import { logger } from "@api/common/logger/client"
import {
  discordChannelsResponseDto,
  discordErrorResponseDto,
  discordMessageResponseDto,
  discordTokenResponseDto
} from "./dtos/discord-response.dto"
import type {
  CreateMessageResult,
  DiscordMessage,
  DiscordRequestError,
  EditMessageResult,
  ExchangeDiscordCodeResult,
  ListChannelsResult,
  StartThreadResult
} from "./types"

const AUTHORIZE_URL = "https://discord.com/oauth2/authorize"
const REQUEST_TIMEOUT_MS = 10_000

// VIEW_CHANNEL | SEND_MESSAGES | EMBED_LINKS | READ_MESSAGE_HISTORY | CREATE_PUBLIC_THREADS | SEND_MESSAGES_IN_THREADS
const BOT_PERMISSIONS = String(1024 + 2048 + 16384 + 65536 + 2 ** 35 + 2 ** 38)

const GUILD_TEXT = 0
const GUILD_ANNOUNCEMENT = 5

const THREAD_ALREADY_CREATED = 160004
const THREAD_NAME_MAX_LENGTH = 100
const THREAD_AUTO_ARCHIVE_MINUTES = 1440

// https://discord.com/developers/docs/topics/opcodes-and-status-codes#json
const ERROR_CODES = new Map<number, DiscordRequestError>([
  [10003, "unknown_channel"],
  [10004, "unknown_guild"],
  [50001, "missing_access"],
  [50013, "missing_permissions"]
])

class DiscordClient {
  constructor(
    private readonly baseUrl: string,
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly botToken: string
  ) {}

  botAuthorizationUrl(redirectUri: string, state: string): string {
    const url = new URL(AUTHORIZE_URL)
    url.search = new URLSearchParams({
      client_id: this.clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: "bot",
      permissions: BOT_PERMISSIONS,
      integration_type: "0",
      state
    }).toString()
    return url.toString()
  }

  // The bot-scope code grant returns the guild the bot was added to.
  async exchangeCode(
    code: string,
    redirectUri: string
  ): Promise<ExchangeDiscordCodeResult> {
    const response = await fetch(`${this.baseUrl}/oauth2/token`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        authorization: `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    })

    const responseStatus = response.status
    const responseText = await response.text()

    if (!response.ok) {
      logger.error(`Discord token exchange failed with ${responseStatus}`, {
        statusCode: responseStatus,
        responseText
      })
      return {
        success: false,
        error: new Error(`Discord token exchange failed with ${responseStatus}`)
      }
    }

    const parsed = parseJson(responseText, discordTokenResponseDto)

    if (!parsed.success) {
      return { success: false, error: parsed.error }
    }

    if (!parsed.data.guild) {
      return {
        success: false,
        error: new Error("Discord token exchange returned no guild")
      }
    }

    return { success: true, guild: parsed.data.guild }
  }

  async listTextChannels(guildId: string): Promise<ListChannelsResult> {
    const path = `/guilds/${guildId}/channels`

    let response: Response
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        headers: { authorization: `Bot ${this.botToken}` },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      })
    } catch (error) {
      logger.error("Discord request failed", { path, error })
      return { success: false, error: "unavailable" }
    }

    const responseStatus = response.status
    const responseText = await response.text()

    if (!response.ok) {
      const body = parseJson(responseText, discordErrorResponseDto)
      const error =
        (body.success && ERROR_CODES.get(body.data.code)) || "unavailable"

      logger.warn(`Discord list channels failed with ${responseStatus}`, {
        path,
        statusCode: responseStatus,
        responseText
      })
      return { success: false, error }
    }

    const parsed = parseJson(responseText, discordChannelsResponseDto)

    if (!parsed.success) {
      logger.error("Discord returned an invalid body", {
        path,
        responseText,
        error: parsed.error
      })
      return { success: false, error: "unavailable" }
    }

    const channels = parsed.data
      .filter(
        (channel) =>
          channel.type === GUILD_TEXT || channel.type === GUILD_ANNOUNCEMENT
      )
      .toSorted((a, b) => a.position - b.position)
      .map(({ id, name }) => ({ id, name }))

    return { success: true, channels }
  }

  async createMessage(
    channelId: string,
    message: DiscordMessage
  ): Promise<CreateMessageResult> {
    const path = `/channels/${channelId}/messages`

    let response: Response
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: {
          authorization: `Bot ${this.botToken}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({ ...message, allowed_mentions: { parse: [] } }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      })
    } catch (error) {
      logger.error("Discord request failed", { path, error })
      return { success: false, error: "unavailable" }
    }

    const responseStatus = response.status
    const responseText = await response.text()

    if (!response.ok) {
      const body = parseJson(responseText, discordErrorResponseDto)
      const error =
        (body.success && ERROR_CODES.get(body.data.code)) || "unavailable"

      logger.warn(`Discord create message failed with ${responseStatus}`, {
        path,
        statusCode: responseStatus,
        responseText
      })
      return { success: false, error }
    }

    const parsed = parseJson(responseText, discordMessageResponseDto)

    if (!parsed.success) {
      logger.error("Discord returned an invalid body", {
        path,
        responseText,
        error: parsed.error
      })
      return { success: false, error: "unavailable" }
    }

    return { success: true, messageId: parsed.data.id }
  }

  async editMessage(
    channelId: string,
    messageId: string,
    message: DiscordMessage
  ): Promise<EditMessageResult> {
    const path = `/channels/${channelId}/messages/${messageId}`

    let response: Response
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method: "PATCH",
        headers: {
          authorization: `Bot ${this.botToken}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({ ...message, allowed_mentions: { parse: [] } }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      })
    } catch (error) {
      logger.error("Discord request failed", { path, error })
      return { success: false, error: "unavailable" }
    }

    if (!response.ok) {
      const responseStatus = response.status
      const responseText = await response.text()
      const body = parseJson(responseText, discordErrorResponseDto)
      const error =
        (body.success && ERROR_CODES.get(body.data.code)) || "unavailable"

      logger.warn(`Discord edit message failed with ${responseStatus}`, {
        path,
        statusCode: responseStatus,
        responseText
      })
      return { success: false, error }
    }

    return { success: true }
  }

  // The thread takes the starter message's id; an existing thread counts as started.
  async startThread(
    channelId: string,
    messageId: string,
    name: string
  ): Promise<StartThreadResult> {
    const path = `/channels/${channelId}/messages/${messageId}/threads`

    let response: Response
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: {
          authorization: `Bot ${this.botToken}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          name: name.slice(0, THREAD_NAME_MAX_LENGTH),
          auto_archive_duration: THREAD_AUTO_ARCHIVE_MINUTES
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      })
    } catch (error) {
      logger.error("Discord request failed", { path, error })
      return { success: false, error: "unavailable" }
    }

    if (response.ok) {
      return { success: true, threadId: messageId }
    }

    const responseStatus = response.status
    const responseText = await response.text()
    const body = parseJson(responseText, discordErrorResponseDto)

    if (body.success && body.data.code === THREAD_ALREADY_CREATED) {
      return { success: true, threadId: messageId }
    }

    const error =
      (body.success && ERROR_CODES.get(body.data.code)) || "unavailable"

    logger.warn(`Discord start thread failed with ${responseStatus}`, {
      path,
      statusCode: responseStatus,
      responseText
    })
    return { success: false, error }
  }
}

export const discordClient = new DiscordClient(
  env.DISCORD_API_URL,
  env.DISCORD_CLIENT_ID,
  env.DISCORD_CLIENT_SECRET,
  env.DISCORD_BOT_TOKEN
)
