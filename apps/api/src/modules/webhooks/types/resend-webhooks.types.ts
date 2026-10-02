import type { resendWebhooks } from "@api/common/database/schema"
import type { ResendAccessError } from "@api/modules/installations/types/installations.types"

export type StoredResendWebhook = typeof resendWebhooks.$inferSelect

export type StoreResendWebhook = Pick<
  StoredResendWebhook,
  "webhookId" | "signingSecretEncrypted"
>

export type LockedWebhookHandler<T> = (
  stored: StoredResendWebhook | null
) => Promise<{ result: T; webhook: StoreResendWebhook }>

export type WebhookStatus = "active" | "disabled" | "missing"

export type ProvisionWebhookResult =
  | { success: true; status: WebhookStatus }
  | { success: false; error: ResendAccessError }

export type WebhookStatusResult =
  | { success: true; status: WebhookStatus }
  | { success: false; error: ResendAccessError }
