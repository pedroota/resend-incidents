import { createHash, randomBytes } from "node:crypto"

export function createCodeVerifier(): string {
  return randomBytes(64).toString("base64url")
}

export function createCodeChallenge(codeVerifier: string): string {
  return createHash("sha256").update(codeVerifier).digest("base64url")
}

export function createState(): string {
  return randomBytes(24).toString("base64url")
}
