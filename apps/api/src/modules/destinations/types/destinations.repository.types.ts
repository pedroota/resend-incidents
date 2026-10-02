import type { destinations } from "@api/common/database/schema"

export type Destination = typeof destinations.$inferSelect

export interface UpsertDestination {
  installationId: string
  name: string
  guildId: string
  channelId: string
}
