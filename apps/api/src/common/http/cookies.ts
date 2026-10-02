import { env } from "@api/common/env/environment"

export const OAUTH_COOKIE = "resend_oauth"
export const DISCORD_OAUTH_COOKIE = "discord_oauth"

export const cookieSigning = {
  secrets: env.COOKIE_SECRET,
  sign: [OAUTH_COOKIE, DISCORD_OAUTH_COOKIE]
}

export const oauthCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/oauth/resend",
  maxAge: 10 * 60
} as const

export const discordOauthCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/oauth/discord",
  maxAge: 10 * 60
} as const

// To expire a cookie, reuse its original path/domain options.
export function expiredCookie<T extends { maxAge: number }>(options: T) {
  return { ...options, value: "", maxAge: 0 }
}
