import type { AnyElysia } from "elysia"
import { destinationsController } from "./destinations/controllers/destinations.controller"
import { discordController } from "./discord/controllers/discord.controller"
import { discordOauthController } from "./discord/controllers/discord-oauth.controller"
import { healthController } from "./health/controllers/health.controller"
import { installationsController } from "./installations/controllers/installations.controller"
import { oauthController } from "./oauth/controllers/oauth.controller"
import { registrationsController } from "./registrations/controllers/registrations.controller"
import { installationWebhookController } from "./webhooks/controllers/installation-webhook.controller"
import { resendWebhookReceiverController } from "./webhooks/controllers/resend-webhook-receiver.controller"

function buildApiRoutes<const T extends AnyElysia[]>(...controllers: T): T {
  return controllers
}

export const apiRoutes = buildApiRoutes(
  healthController,
  oauthController,
  registrationsController,
  installationsController,
  discordOauthController,
  discordController,
  destinationsController,
  installationWebhookController,
  resendWebhookReceiverController
)
