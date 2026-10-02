import type { ResendDomain } from "@api/common/resend/types"

export type ResendAccessError = "not_connected" | "resend_unavailable"

export type AccessTokenResult =
  | { success: true; accessToken: string }
  | { success: false; error: ResendAccessError }

export type LockedAccessTokenResult =
  | AccessTokenResult
  | { success: false; error: "grant_rejected" }

export type ListDomainsResult =
  | { success: true; domains: ResendDomain[] }
  | { success: false; error: ResendAccessError }
