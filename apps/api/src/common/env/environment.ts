import { z } from "zod"

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "local", "test"])
    .default("local"),
  PORT: z.coerce.number().default(3333),
  TRUSTED_ORIGINS: z.string().transform((val) => val.split(",")),
  DATABASE_URL: z.url(),
  REDIS_URL: z.url().startsWith("redis://"),
  API_URL: z.url(),
  MAX_USERS: z.coerce.number().int().positive().default(20),
  WEBHOOK_BASE_URL: z.url().optional(),
  WEB_URL: z.url(),
  COOKIE_SECRET: z.string().min(32),
  AUTH_SECRET: z.string().min(32),
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  TOKEN_ENCRYPTION_KEY: z
    .base64()
    .transform((value) => Buffer.from(value, "base64"))
    .refine((key) => key.length === 32, {
      message: "Must be 32 bytes encoded as base64"
    }),
  RESEND_API_URL: z.url().default("https://api.resend.com"),
  RESEND_CLIENT_ID: z.string().min(1),
  DISCORD_API_URL: z.url().default("https://discord.com/api/v10"),
  DISCORD_CLIENT_ID: z.string().min(1),
  DISCORD_CLIENT_SECRET: z.string().min(1),
  DISCORD_BOT_TOKEN: z.string().min(1)
})

const parsed = envSchema.safeParse(
  Object.fromEntries(
    Object.entries(process.env).filter(([, value]) => value !== "")
  )
)

if (!parsed.success) {
  console.error("Invalid environment variables")
  console.error(parsed.error.issues)
  process.exit(1)
}

export const env = parsed.data

export type NodeEnvironment = typeof env.NODE_ENV
