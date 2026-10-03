import { discordClient } from "@api/common/discord/client"
import type {
  DiscordMessage,
  DiscordRequestError
} from "@api/common/discord/types"
import { logger } from "@api/common/logger/client"
import { destinationsRepository } from "@api/modules/destinations/repositories/destinations.repository"
import type {
  DestinationError,
  IncidentAlert
} from "@api/modules/destinations/types/destination.types"
import type {
  AddDiscordDestinationResult,
  ListDestinationsResult,
  SendIncidentAlertResult,
  UpdateIncidentAlertResult
} from "@api/modules/destinations/types/destinations.types"
import { discordGuildsService } from "@api/modules/discord/services/discord-guilds.service"
import { installationsRepository } from "@api/modules/installations/repositories/installations.repository"

const CRITICAL_COLOR = 0xe5484d
const WARNING_COLOR = 0xffb224
const RESOLVED_COLOR = 0x30a46c

// https://discord.com/developers/docs/components/reference#button-button-styles
const LINK_BUTTON = 5

function destinationError(error: DiscordRequestError): DestinationError {
  switch (error) {
    case "unknown_channel":
    case "unknown_guild":
      return "channel_not_found"
    case "missing_access":
    case "missing_permissions":
      return "missing_permissions"
    case "unavailable":
      return "destination_unavailable"
  }
}

function alertMessage(alert: IncidentAlert): DiscordMessage {
  const openColor =
    alert.severity === "critical" ? CRITICAL_COLOR : WARNING_COLOR

  return {
    content: "",
    embeds: [
      {
        title: `${alert.title}${alert.status === "open" ? "" : " (resolved)"}`,
        description: alert.summary,
        color: alert.status === "open" ? openColor : RESOLVED_COLOR,
        fields: [
          { name: "Domain", value: `\`${alert.domain}\``, inline: true },
          { name: "Severity", value: alert.severity, inline: true },
          { name: "Observed", value: alert.observed, inline: true },
          { name: "Impact", value: alert.impact }
        ],
        footer: { text: "Resend Incidents" },
        timestamp: alert.startedAt.toISOString()
      }
    ],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: LINK_BUTTON,
            label: "Open in Resend",
            url: alert.resendUrl
          }
        ]
      }
    ]
  }
}

async function list(installationId: string): Promise<ListDestinationsResult> {
  const isConnected =
    await installationsRepository.isInstallationConnected(installationId)

  if (!isConnected) {
    return { success: false, error: "not_connected" }
  }

  const destinations = await destinationsRepository.list(installationId)

  return { success: true, destinations }
}

// The bot token is shared across servers, so the channel must be in this installation's guild.
async function addDiscord(
  installationId: string,
  channelId: string
): Promise<AddDiscordDestinationResult> {
  const guildChannels = await discordGuildsService.listChannels(installationId)

  if (!guildChannels.success) {
    return guildChannels
  }

  const channel = guildChannels.channels.find(({ id }) => id === channelId)

  if (!channel) {
    return { success: false, error: "channel_not_found" }
  }

  const destination = await destinationsRepository.replace({
    installationId,
    name: `#${channel.name}`,
    guildId: guildChannels.guild.id,
    channelId: channel.id
  })

  if (!destination) {
    throw new Error("Destination replace returned no data")
  }

  logger.info("Discord destination set", {
    installationId,
    destinationId: destination.id
  })

  return { success: true, destination }
}

async function sendAlert(
  installationId: string,
  destinationId: string,
  alert: IncidentAlert
): Promise<SendIncidentAlertResult> {
  const destination = await destinationsRepository.find(
    installationId,
    destinationId
  )

  if (!destination) {
    return { success: false, error: "destination_not_found" }
  }

  const message = await discordClient.createMessage(
    destination.channelId,
    alertMessage(alert)
  )

  if (!message.success) {
    return { success: false, error: destinationError(message.error) }
  }

  return { success: true, messageRef: message.messageId }
}

// Edits the posted alert, then notes the change in its thread; the thread is started on first use and reused after.
// Re-running after a partial failure re-edits the alert and starts no second thread.
async function updateAlert(
  installationId: string,
  destinationId: string,
  messageRef: string,
  alert: IncidentAlert,
  note: string
): Promise<UpdateIncidentAlertResult> {
  const destination = await destinationsRepository.find(
    installationId,
    destinationId
  )

  if (!destination) {
    return { success: false, error: "destination_not_found" }
  }

  const edit = await discordClient.editMessage(
    destination.channelId,
    messageRef,
    alertMessage(alert)
  )

  if (!edit.success) {
    return { success: false, error: destinationError(edit.error) }
  }

  const thread = await discordClient.startThread(
    destination.channelId,
    messageRef,
    alert.title
  )

  if (!thread.success) {
    return { success: false, error: destinationError(thread.error) }
  }

  const reply = await discordClient.createMessage(thread.threadId, {
    content: note,
    embeds: []
  })

  if (!reply.success) {
    return { success: false, error: destinationError(reply.error) }
  }

  return { success: true }
}

export const destinationsService = {
  list,
  addDiscord,
  sendAlert,
  updateAlert
}
