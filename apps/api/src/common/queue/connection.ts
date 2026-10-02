import { Redis } from "ioredis"
import { env } from "@api/common/env/environment"
import { logger } from "@api/common/logger/client"

export function createQueueConnection(connectionName: string) {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    connectionName
  })

  client.on("error", (error) => {
    logger.error("Redis queue connection error", { connectionName, error })
  })

  return client
}
