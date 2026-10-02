import type { z } from "zod"
import { env } from "@api/common/env/environment"
import { parseJson } from "@api/common/json/parse-json"
import type { JsonValue } from "@api/common/json/types"
import { domainsResponseDto } from "../dtos/domains-response.dto"
import {
  createWebhookResponseDto,
  webhookResponseDto,
  webhooksResponseDto
} from "../dtos/webhooks-response.dto"
import { ResendRequestError } from "../errors/resend-request.error"
import type {
  ResendDomain,
  ResendWebhook,
  ResendWebhookEventType,
  ResendWebhookSummary
} from "../types"

interface RequestOptions {
  method?: "GET" | "POST"
  body?: JsonValue
}

// Every call here is made with a team's access token.
class ResendApiClient {
  constructor(private readonly baseUrl: string) {}

  async listDomains(accessToken: string): Promise<ResendDomain[]> {
    const { data } = await this.request(
      accessToken,
      "/domains",
      domainsResponseDto
    )
    return data.map(({ id, name, status }) => ({ id, name, status }))
  }

  async listWebhooks(accessToken: string): Promise<ResendWebhookSummary[]> {
    const { data } = await this.request(
      accessToken,
      "/webhooks",
      webhooksResponseDto
    )
    return data
  }

  // Null when the webhook was deleted on Resend.
  async getWebhook(
    accessToken: string,
    webhookId: string
  ): Promise<ResendWebhook | null> {
    try {
      const webhook = await this.request(
        accessToken,
        `/webhooks/${encodeURIComponent(webhookId)}`,
        webhookResponseDto
      )
      return {
        id: webhook.id,
        status: webhook.status,
        signingSecret: webhook.signing_secret
      }
    } catch (error) {
      if (error instanceof ResendRequestError && error.status === 404) {
        return null
      }

      throw error
    }
  }

  async createWebhook(
    accessToken: string,
    endpoint: string,
    events: readonly ResendWebhookEventType[]
  ): Promise<ResendWebhook> {
    const webhook = await this.request(
      accessToken,
      "/webhooks",
      createWebhookResponseDto,
      { method: "POST", body: { endpoint, events: [...events] } }
    )
    return {
      id: webhook.id,
      status: "enabled",
      signingSecret: webhook.signing_secret
    }
  }

  // Throws `ResendRequestError` on a non-2xx answer and the parse error when the body doesn't match `responseDto`.
  private async request<TSchema extends z.ZodType>(
    accessToken: string,
    path: string,
    responseDto: TSchema,
    { method = "GET", body }: RequestOptions = {}
  ): Promise<z.output<TSchema>> {
    const response = await fetch(new URL(path, this.baseUrl), {
      method,
      headers:
        body === undefined
          ? { authorization: `Bearer ${accessToken}` }
          : {
              authorization: `Bearer ${accessToken}`,
              "content-type": "application/json"
            },
      body: body === undefined ? undefined : JSON.stringify(body)
    })

    const responseText = await response.text()

    if (!response.ok) {
      throw new ResendRequestError(path, response.status, responseText)
    }

    const parsed = parseJson(responseText, responseDto)

    if (!parsed.success) {
      throw parsed.error
    }

    return parsed.data
  }
}

export const resendApiClient = new ResendApiClient(env.RESEND_API_URL)
