import { SQL } from "bun"
import { drizzle } from "drizzle-orm/bun-sql"
import { env } from "@api/common/env/environment"
import { logger } from "@api/common/logger/client"
import * as schema from "./schema"

const client = new SQL({
  url: env.DATABASE_URL,
  max: 10,
  idleTimeout: 30, // recycle idle conns before the host drops them
  connectionTimeout: 10,
  onconnect: (error) => {
    if (error) {
      logger.error("PostgreSQL connection failed", { error })
    }
  },
  onclose: (error) => {
    if (!error) {
      return
    }

    if (
      error instanceof SQL.PostgresError &&
      error.code === "ERR_POSTGRES_IDLE_TIMEOUT"
    ) {
      logger.debug("PostgreSQL idle connection recycled")
      return
    }

    logger.error("PostgreSQL connection closed with error", { error })
  }
})

export const database = drizzle({ client, schema, casing: "snake_case" })

export type Database = typeof database
