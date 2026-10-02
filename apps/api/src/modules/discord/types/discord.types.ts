import type { discordGuilds } from "@api/common/database/schema"
import type { DiscordChannel, DiscordGuild } from "@api/common/discord/types"

export type UpsertDiscordGuild = Omit<
  typeof discordGuilds.$inferInsert,
  "id" | "createdAt" | "updatedAt"
>

export type DiscordOAuthErrorReason =
  | "access_denied"
  | "invalid_state"
  | "not_connected"
  | "unknown"

export type CompleteDiscordAuthorizationResult =
  | { success: true }
  | { success: false; reason: DiscordOAuthErrorReason }

export type ListGuildChannelsError =
  | "not_connected"
  | "discord_not_installed"
  | "bot_not_in_server"
  | "discord_unavailable"

export type ListGuildChannelsResult =
  | { success: true; guild: DiscordGuild; channels: DiscordChannel[] }
  | { success: false; error: ListGuildChannelsError }
