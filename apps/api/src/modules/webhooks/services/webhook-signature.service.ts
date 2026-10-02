import { createHmac } from "node:crypto"
import { statesMatch } from "@api/common/crypto/states-match"
import { SIGNATURE_TOLERANCE_SECONDS } from "@api/modules/webhooks/constants/webhooks.constants"
import type { SvixHeaders } from "@api/modules/webhooks/types/webhook-events.types"

const SECRET_PREFIX = "whsec_"
const SIGNATURE_VERSION = "v1"

// Svix scheme: base64 HMAC-SHA256 of `${id}.${timestamp}.${rawBody}`.
// https://docs.svix.com/receiving/verifying-payloads/how-manual
function isSignatureValid(
  signingSecret: string,
  headers: SvixHeaders,
  rawBody: string
) {
  const { id, timestamp, signature } = headers

  if (!id || !timestamp || !signature) {
    return false
  }

  const timestampSeconds = Number(timestamp)
  const nowSeconds = Math.floor(new Date().getTime() / 1000)

  if (
    !Number.isInteger(timestampSeconds) ||
    Math.abs(nowSeconds - timestampSeconds) > SIGNATURE_TOLERANCE_SECONDS
  ) {
    return false
  }

  const key = Buffer.from(
    signingSecret.startsWith(SECRET_PREFIX)
      ? signingSecret.slice(SECRET_PREFIX.length)
      : signingSecret,
    "base64"
  )
  const expected = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest("base64")

  // The header lists `v1,<sig>` entries separated by spaces during secret rotation.
  return signature.split(" ").some((entry) => {
    const [version, received] = entry.split(",")
    return (
      version === SIGNATURE_VERSION &&
      received !== undefined &&
      statesMatch(expected, received)
    )
  })
}

export const webhookSignatureService = {
  isSignatureValid
}
