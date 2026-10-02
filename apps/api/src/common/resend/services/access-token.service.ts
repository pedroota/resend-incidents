import { parseJson } from "@api/common/json/parse-json"
import { accessTokenClaimsDto } from "../dtos/access-token-claims.dto"

export type TeamIdResult =
  | { success: true; teamId: string }
  | { success: false; error: unknown }

// Safe to read claims without verifying signature as token is from Resend over TLS.
export function teamIdFromAccessToken(accessToken: string): TeamIdResult {
  const payload = accessToken.split(".")[1]

  if (!payload) {
    return {
      success: false,
      error: new Error("Resend access token is not a JWT")
    }
  }

  const claims = parseJson(
    Buffer.from(payload, "base64url").toString("utf8"),
    accessTokenClaimsDto
  )

  if (!claims.success) {
    return { success: false, error: claims.error }
  }

  return { success: true, teamId: claims.data.team_id ?? claims.data.sub }
}
