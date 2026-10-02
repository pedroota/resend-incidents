import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"
import { env } from "@api/common/env/environment"

const ALGORITHM = "aes-256-gcm"
const VERSION = "v1"

interface TokenCipher {
  encrypt(plaintext: string): string
  decrypt(encrypted: string): string
}

// AES-256-GCM; output is `v1.<iv>.<authTag>.<ciphertext>` in base64url.
class AesGcmTokenCipher implements TokenCipher {
  constructor(private readonly key: Buffer) {
    if (key.length !== 32) {
      throw new Error("Token encryption key must be 32 bytes")
    }
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(12)
    const cipher = createCipheriv(ALGORITHM, this.key, iv)
    const body = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final()
    ])

    return [
      VERSION,
      iv.toString("base64url"),
      cipher.getAuthTag().toString("base64url"),
      body.toString("base64url")
    ].join(".")
  }

  decrypt(encrypted: string): string {
    const [version, iv, tag, body] = encrypted.split(".")

    if (version !== VERSION || !iv || !tag || !body) {
      throw new Error("Unrecognized encrypted token format")
    }

    const decipher = createDecipheriv(
      ALGORITHM,
      this.key,
      Buffer.from(iv, "base64url")
    )
    decipher.setAuthTag(Buffer.from(tag, "base64url"))

    return Buffer.concat([
      decipher.update(Buffer.from(body, "base64url")),
      decipher.final()
    ]).toString("utf8")
  }
}

export const tokenCipher = new AesGcmTokenCipher(env.TOKEN_ENCRYPTION_KEY)
