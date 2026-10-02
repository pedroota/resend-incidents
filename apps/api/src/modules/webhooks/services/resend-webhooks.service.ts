import { tokenCipher } from "@api/common/crypto/token-cipher"
import { env } from "@api/common/env/environment"
import { logger } from "@api/common/logger/client"
import { resendApiClient } from "@api/common/resend/clients/resend-api.client"
import type { ResendWebhook } from "@api/common/resend/types"
import { resendAccessService } from "@api/modules/installations/services/resend-access.service"
import {
  RECEIVER_PREFIX,
  WEBHOOK_EVENTS
} from "@api/modules/webhooks/constants/webhooks.constants"
import { resendWebhooksRepository } from "@api/modules/webhooks/repositories/resend-webhooks.repository"
import type {
  ProvisionWebhookResult,
  WebhookStatusResult
} from "@api/modules/webhooks/types/resend-webhooks.types"

const receiverUrl = (installationId: string) => {
  const baseUrl = env.WEBHOOK_BASE_URL ?? env.API_URL
  return `${baseUrl}${RECEIVER_PREFIX}/${installationId}`
}

// Reuses the stored webhook, then one already targeting our receiver endpoint, before creating a new one.
async function findOrCreateWebhook(
  accessToken: string,
  endpoint: string,
  storedWebhookId: string | null
): Promise<ResendWebhook> {
  const storedWebhook = storedWebhookId
    ? await resendApiClient.getWebhook(accessToken, storedWebhookId)
    : null

  if (storedWebhook) {
    return storedWebhook
  }

  const webhooks = await resendApiClient.listWebhooks(accessToken)
  const listedReceiverWebhook = webhooks.find(
    (webhook) => webhook.endpoint === endpoint
  )
  const receiverWebhook = listedReceiverWebhook
    ? await resendApiClient.getWebhook(accessToken, listedReceiverWebhook.id)
    : null

  if (receiverWebhook) {
    return receiverWebhook
  }

  return resendApiClient.createWebhook(accessToken, endpoint, WEBHOOK_EVENTS)
}

async function provisionWebhook(
  installationId: string
): Promise<ProvisionWebhookResult> {
  const token = await resendAccessService.accessToken(installationId)

  if (!token.success) {
    return token
  }

  try {
    const webhook = await resendWebhooksRepository.ensureLocked(
      installationId,
      async (stored) => {
        const receiverEndpoint = receiverUrl(installationId)

        const resendWebhook = await findOrCreateWebhook(
          token.accessToken,
          receiverEndpoint,
          stored?.webhookId ?? null
        )

        return {
          result: resendWebhook,
          webhook: {
            webhookId: resendWebhook.id,
            signingSecretEncrypted: tokenCipher.encrypt(
              resendWebhook.signingSecret
            )
          }
        }
      }
    )

    logger.info("Resend webhook ready", {
      installationId,
      webhookId: webhook.id
    })

    return {
      success: true,
      status: webhook.status === "enabled" ? "active" : "disabled"
    }
  } catch (error) {
    logger.error("Resend webhook setup failed", { installationId, error })
    return { success: false, error: "resend_unavailable" }
  }
}

async function getWebhookStatus(
  installationId: string
): Promise<WebhookStatusResult> {
  const token = await resendAccessService.accessToken(installationId)

  if (!token.success) {
    return token
  }

  const stored = await resendWebhooksRepository.find(installationId)

  if (!stored) {
    return { success: true, status: "missing" }
  }

  try {
    const webhook = await resendApiClient.getWebhook(
      token.accessToken,
      stored.webhookId
    )

    if (!webhook) {
      return { success: true, status: "missing" }
    }

    return {
      success: true,
      status: webhook.status === "enabled" ? "active" : "disabled"
    }
  } catch (error) {
    logger.error("Resend get webhook failed", { installationId, error })
    return { success: false, error: "resend_unavailable" }
  }
}

export const resendWebhooksService = {
  provisionWebhook,
  getWebhookStatus
}
