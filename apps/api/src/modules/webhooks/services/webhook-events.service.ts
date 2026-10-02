import { tokenCipher } from "@api/common/crypto/token-cipher"
import { parseJson } from "@api/common/json/parse-json"
import { logger } from "@api/common/logger/client"
import {
  COUNTER_WINDOW_MS,
  HANDLED_EVENT_TYPES
} from "@api/modules/webhooks/constants/webhooks.constants"
import {
  emailEventDto,
  webhookEventTypeDto
} from "@api/modules/webhooks/dtos/resend-webhook-event.dto"
import { resendWebhooksRepository } from "@api/modules/webhooks/repositories/resend-webhooks.repository"
import { webhookEventsRepository } from "@api/modules/webhooks/repositories/webhook-events.repository"
import { webhookSignatureService } from "@api/modules/webhooks/services/webhook-signature.service"
import type {
  ReceiveEventResult,
  SvixHeaders
} from "@api/modules/webhooks/types/webhook-events.types"

async function receiveWebhookEvent(
  installationId: string,
  svixHeaders: SvixHeaders,
  rawBody: string
): Promise<ReceiveEventResult> {
  const signingSecretEncrypted =
    await resendWebhooksRepository.findSigningSecret(installationId)

  if (!signingSecretEncrypted || !svixHeaders.id) {
    return { success: false, error: "invalid_signature" }
  }

  const isSignatureValid = webhookSignatureService.isSignatureValid(
    tokenCipher.decrypt(signingSecretEncrypted),
    svixHeaders,
    rawBody
  )

  if (!isSignatureValid) {
    return { success: false, error: "invalid_signature" }
  }

  const parsedEventType = parseJson(rawBody, webhookEventTypeDto)

  if (
    parsedEventType.success &&
    !HANDLED_EVENT_TYPES.has(parsedEventType.data.type)
  ) {
    return { success: true, outcome: "ignored" }
  }

  const parsedEmailEvent = parseJson(rawBody, emailEventDto)

  if (!parsedEmailEvent.success) {
    logger.error("Resend webhook event has an invalid body", {
      installationId,
      svixId: svixHeaders.id,
      error: parsedEmailEvent.error
    })
    return { success: false, error: "invalid_payload" }
  }

  const emailEvent = parsedEmailEvent.data

  // `from` is "Name <user@domain>" or "user@domain".
  const senderDomain = /@([^\s>]+)>?\s*$/
    .exec(emailEvent.data.from)?.[1]
    ?.toLowerCase()

  if (!senderDomain) {
    logger.warn("Resend webhook event without sender domain", {
      installationId,
      svixId: svixHeaders.id
    })
    return { success: true, outcome: "ignored" }
  }

  const occurredAtMs = emailEvent.created_at.getTime()

  const isCounted = await webhookEventsRepository.incrementCounters(
    {
      installationId,
      svixId: svixHeaders.id,
      domain: senderDomain,
      counter: emailEvent.type === "email.sent" ? "sent" : "bounced"
    },
    new Date(Math.floor(occurredAtMs / COUNTER_WINDOW_MS) * COUNTER_WINDOW_MS)
  )

  return { success: true, outcome: isCounted ? "counted" : "duplicate" }
}

export const webhookEventsService = {
  receiveWebhookEvent
}
