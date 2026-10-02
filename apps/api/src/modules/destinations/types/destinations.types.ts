import type { DestinationError } from "./destination.types"
import type { Destination } from "./destinations.repository.types"

export type ListDestinationsResult =
  | { success: true; destinations: Destination[] }
  | { success: false; error: "not_connected" }

export type AddDiscordDestinationResult =
  | { success: true; destination: Destination }
  | {
      success: false
      error:
        | "not_connected"
        | "discord_not_installed"
        | "bot_not_in_server"
        | "channel_not_found"
        | "discord_unavailable"
    }

export type SendIncidentAlertResult =
  | { success: true; messageRef: string }
  | { success: false; error: "destination_not_found" | DestinationError }

export type UpdateIncidentAlertResult =
  | { success: true }
  | { success: false; error: "destination_not_found" | DestinationError }
