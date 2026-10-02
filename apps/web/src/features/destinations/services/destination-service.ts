import { httpClient } from "@/lib/http-client"

export async function listDestinations() {
  const { data, error } = await httpClient.installations.me.destinations.get()

  if (error) {
    throw error
  }

  return data
}

export async function listDiscordChannels() {
  const { data, error } =
    await httpClient.installations.me.discord.channels.get()

  if (error) {
    throw error
  }

  return data
}

export async function addDiscordDestination(channelId: string) {
  const { data, error } =
    await httpClient.installations.me.destinations.discord.post({ channelId })

  if (error) {
    throw error
  }

  return data
}

export const destinationKeys = {
  all: ["destinations"],
  list: () => ["destinations", "list"],
  discordChannels: () => ["destinations", "discord", "channels"]
} as const
