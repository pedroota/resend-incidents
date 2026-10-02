import { cors } from "@elysiajs/cors"
import { Elysia } from "elysia"
import { env } from "./common/env/environment"
import { cookieSigning } from "./common/http/cookies"
import { logger } from "./common/logger/client"
import { startQueue, stopQueue } from "./common/queue"
import { betterAuth } from "./modules/auth/auth.macro"
import { apiRoutes } from "./modules/registry"

const app = new Elysia({ cookie: cookieSigning })
  .use(cors({ origin: env.TRUSTED_ORIGINS, credentials: true }))
  .use(betterAuth)
  .onStart(() => {
    startQueue().catch((error) => {
      logger.error("Failed to start job queue", { error })
    })
  })
  .use(apiRoutes)
  .listen(env.PORT, ({ url }) => {
    logger.info(`API running at ${url}`)
  })

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, async () => {
    await stopQueue().catch((error) => {
      logger.error("Failed to stop job queue", { error })
    })
    process.exit(0)
  })
}

export type App = typeof app
