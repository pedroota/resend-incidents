import { createAuthClient } from "better-auth/react"
import { env } from "./env"

export const authKeys = {
  session: () => ["auth", "session"] as const
}

export const authClient = createAuthClient({
  baseURL: `${env.VITE_API_URL}/api/auth`
})

export async function getSession() {
  const { data, error } = await authClient.getSession()

  if (error) {
    throw error
  }

  return data
}
