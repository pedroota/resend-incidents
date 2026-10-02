export type CounterColumn = "sent" | "bounced"

export interface CountedEmailEvent {
  installationId: string
  svixId: string
  domain: string
  counter: CounterColumn
}

export interface SvixHeaders {
  id: string | undefined
  timestamp: string | undefined
  signature: string | undefined
}

export type ReceiveEventResult =
  | { success: true; outcome: "counted" | "duplicate" | "ignored" }
  | { success: false; error: "invalid_signature" | "invalid_payload" }
