import type { JsonValue } from "@api/common/json/types"

export type OutboxEventName = "incident.opened" | "incident.updated"

export interface OutboxEvent {
  eventName: OutboxEventName
  payload: JsonValue
  dedupeKey: string
}

export type EventProcessor = (payload: JsonValue) => Promise<void>
