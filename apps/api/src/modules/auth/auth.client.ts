import { betterAuth } from "better-auth"
import { APIError } from "better-auth/api"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { database } from "@api/common/database"
import {
  accounts,
  sessions,
  users,
  verifications
} from "@api/common/database/schema"
import { env } from "@api/common/env/environment"
import { logger } from "@api/common/logger/client"
import { registrationsService } from "@api/modules/registrations/services/registrations.service"

export const auth = betterAuth({
  baseURL: env.API_URL,
  basePath: "/auth",
  secret: env.AUTH_SECRET,
  logger: {
    disabled: false,
    disableColors: true,
    log(level, message, ...args) {
      switch (level) {
        case "error":
          logger.error(message, { args })
          break
        case "warn":
          logger.warn(message, { args })
          break
        case "debug":
          logger.debug(message, { args })
          break
        default:
          logger.info(message, { args })
          break
      }
    }
  },
  database: drizzleAdapter(database, {
    provider: "pg",
    usePlural: true,
    schema: { users, sessions, accounts, verifications }
  }),
  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
      redirectURI: `${env.API_URL}/api/auth/callback/github`
    }
  },
  account: {
    encryptOAuthTokens: true
  },
  databaseHooks: {
    user: {
      create: {
        async before() {
          const { isFull } = await registrationsService.getStatus()

          if (isFull) {
            throw new APIError("FORBIDDEN", {
              message: "Registration limit reached"
            })
          }
        }
      }
    }
  },
  advanced: {
    cookiePrefix: "resend-incidents",
    database: {
      generateId: "uuid"
    }
  },
  telemetry: {
    enabled: false
  },
  trustedOrigins: env.TRUSTED_ORIGINS
})
