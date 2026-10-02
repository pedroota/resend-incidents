import { httpClient } from "@/lib/http-client"

export async function listInstallationDomains() {
  const { data, error } = await httpClient.installations.me.domains.get()

  if (error) {
    throw error
  }

  return data
}

export async function getInstallationWebhook() {
  const { data, error } = await httpClient.installations.me.webhook.get()

  if (error) {
    throw error
  }

  return data
}

export async function setUpInstallationWebhook() {
  const { data, error } = await httpClient.installations.me.webhook.post()

  if (error) {
    throw error
  }

  return data
}

export const installationKeys = {
  all: ["installations"],
  domains: () => ["installations", "me", "domains"],
  webhook: () => ["installations", "me", "webhook"]
} as const
