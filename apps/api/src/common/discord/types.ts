export interface DiscordGuild {
  id: string
  name: string
}

export interface DiscordChannel {
  id: string
  name: string
}

export interface DiscordEmbed {
  title: string
  description: string
  color: number
  fields: { name: string; value: string; inline?: boolean }[]
  footer: { text: string }
  timestamp: string
}

// https://discord.com/developers/docs/components/reference#button
export interface DiscordLinkButton {
  type: 2
  style: 5
  label: string
  url: string
}

export interface DiscordActionRow {
  type: 1
  components: DiscordLinkButton[]
}

export interface DiscordMessage {
  content: string
  embeds: DiscordEmbed[]
  components?: DiscordActionRow[]
}

export type DiscordRequestError =
  | "unknown_channel"
  | "unknown_guild"
  | "missing_access"
  | "missing_permissions"
  | "unavailable"

export type ExchangeDiscordCodeResult =
  | { success: true; guild: DiscordGuild }
  | { success: false; error: unknown }

export type ListChannelsResult =
  | { success: true; channels: DiscordChannel[] }
  | { success: false; error: DiscordRequestError }

export type CreateMessageResult =
  | { success: true; messageId: string }
  | { success: false; error: DiscordRequestError }

export type StartThreadResult =
  | { success: true; threadId: string }
  | { success: false; error: DiscordRequestError }

export type EditMessageResult =
  | { success: true }
  | { success: false; error: DiscordRequestError }
