import {
  BOUNCE_CRITICAL_RATE,
  BOUNCE_MIN_SENT,
  BOUNCE_WARNING_RATE
} from "@api/modules/incidents/constants/incidents.constants"
import type { BounceSpike } from "@api/modules/incidents/types/incidents.types"

export function evaluateBounceSpike(
  sent: number,
  bounced: number
): BounceSpike | null {
  if (sent < BOUNCE_MIN_SENT) {
    return null
  }

  const rate = bounced / sent

  if (rate >= BOUNCE_CRITICAL_RATE) {
    return { severity: "critical", rate }
  }

  if (rate >= BOUNCE_WARNING_RATE) {
    return { severity: "warning", rate }
  }

  return null
}
