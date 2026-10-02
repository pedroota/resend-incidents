import { defineConfig } from "drizzle-kit"

export default defineConfig({
  out: "./src/common/database/migrations",
  schema: "./src/common/database/schema.ts",
  dialect: "postgresql",
  casing: "snake_case",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    ssl: false
  }
})
