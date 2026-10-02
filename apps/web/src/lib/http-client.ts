import type { App } from "@api/main"
import { EdenFetchError, treaty } from "@elysiajs/eden"
import { z } from "zod"
import { env } from "./env"

// Credentials carry the Better Auth session cookie set by the GitHub sign-in.
export const httpClient = treaty<App>(env.VITE_API_URL, {
  fetch: {
    credentials: "include"
  }
})

const apiErrorDto = z.object({ error: z.string() })

// Error code the API sent in its body, or null for network/unknown failures.
export function apiErrorCode(error: Error) {
  if (!(error instanceof EdenFetchError)) {
    return null
  }

  const parsed = apiErrorDto.safeParse(error.value)
  return parsed.success ? parsed.data.error : null
}

function isKnownCode<Copy extends object>(
  copy: Copy,
  code: string
): code is Extract<keyof Copy, string> {
  return Object.hasOwn(copy, code)
}

// Error code the API sent when `copy` has an entry for it, otherwise `fallback`.
export function knownApiErrorCode<Copy extends object>(
  error: Error,
  copy: Copy,
  fallback: Extract<keyof Copy, string>
) {
  const code = apiErrorCode(error)

  if (code === null || !isKnownCode(copy, code)) {
    return fallback
  }

  return code
}
