import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { Pool } from "pg"

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run migrations")
}

const pool = new Pool({ connectionString: databaseUrl })

await migrate(drizzle(pool, { casing: "snake_case" }), {
  migrationsFolder: "./src/common/database/migrations"
})

console.log("✅ Migrations applied")

await pool.end()
