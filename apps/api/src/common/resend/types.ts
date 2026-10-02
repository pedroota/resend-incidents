export interface ResendTokens {
  teamId: string
  accessToken: string
  refreshToken: string
  expiresInSeconds: number
  scope: string
}

export interface ResendDomain {
  id: string
  name: string
  status: string
}

export type ResendWebhookStatus = "enabled" | "disabled"

export type ResendWebhookEventType = "email.sent" | "email.bounced"

export interface ResendWebhookSummary {
  id: string
  endpoint: string
  status: ResendWebhookStatus
}

export interface ResendWebhook {
  id: string
  status: ResendWebhookStatus
  signingSecret: string
}

export type ExchangeCodeResult =
  | { success: true; tokens: ResendTokens }
  | { success: false; error: unknown }

export type RefreshTokensResult =
  | { success: true; tokens: ResendTokens }
  | { success: false; reason: "rejected" | "unavailable" }
