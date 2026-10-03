import { parseArgs } from "node:util"
import { sql } from "drizzle-orm"
import { database } from "@api/common/database"
import { env } from "@api/common/env/environment"

// Truncates every table in the public schema. Destructive, local/dev use only.
const { values } = parseArgs({
  options: {
    yes: { type: "boolean", default: false }
  }
})

if (env.NODE_ENV === "production") {
  throw new Error("Refusing to wipe the database in production")
}

if (!values.yes) {
  throw new Error("Pass --yes to confirm wiping the database")
}

const tables = await database.execute<{ tablename: string }>(
  sql`select tablename from pg_tables where schemaname = 'public'`
)

if (tables.length === 0) {
  console.log("No tables found, nothing to wipe")
  process.exit(0)
}

const tableNames = tables.map((table) => `"${table.tablename}"`).join(", ")

await database.execute(
  sql.raw(`truncate table ${tableNames} restart identity cascade`)
)

console.log(`Wiped ${tables.length} table(s): ${tableNames}`)
process.exit(0)
