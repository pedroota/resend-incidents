import type { IncidentAlert } from "@api/modules/destinations/types/destination.types"
import {
  RESEND_DASHBOARD_URL,
  RESEND_PAUSE_BOUNCE_RATE
} from "@api/modules/incidents/constants/incidents.constants"
import type { Incident } from "@api/modules/incidents/types/incidents.repository.types"
import type { IncidentChange } from "@api/modules/incidents/types/incidents.types"

// Built from the stored state, so every send or edit shows the latest peak and severity.
export function incidentAlert(incident: Incident): IncidentAlert {
  const { peakBounced, peakSent } = incident.bounce
  const rate = peakBounced / peakSent
  const isResolved = incident.resolvedAt !== null
  const observed = isResolved
    ? `${(rate * 100).toFixed(1)}% in one hour`
    : `${(rate * 100).toFixed(1)}% in the last hour`
  const pausePoints = (Math.abs(RESEND_PAUSE_BOUNCE_RATE - rate) * 100).toFixed(
    1
  )
  const rateState = `Bounce rate ${isResolved ? "peaked at" : "is at"} ${observed}`

  return {
    status: isResolved ? "resolved" : "open",
    severity: incident.severity,
    title: `Bounce rate spike on ${incident.domain}`,
    domain: incident.domain,
    observed,
    summary:
      rate < RESEND_PAUSE_BOUNCE_RATE
        ? `${rateState}. ${pausePoints} points below Resend's 4% pause threshold.`
        : `${rateState}. ${pausePoints} points above Resend's 4% pause threshold, Resend may pause sending.`,
    impact: `${peakBounced.toLocaleString("en-US")} of ${peakSent.toLocaleString("en-US")} emails bounced in ${isResolved ? "the worst hour" : "the last hour"}.`,
    startedAt: incident.openedAt,
    resendUrl: `${RESEND_DASHBOARD_URL}/emails`
  }
}

export function incidentChangeNote(
  incident: Incident,
  change: IncidentChange
): string {
  const { openedAt } = incident
  const { peakBounced, peakSent, affectedBounced, affectedSent } =
    incident.bounce
  const peak = `${((peakBounced / peakSent) * 100).toFixed(1)}%`
  const peakEmails = `${peakBounced.toLocaleString("en-US")} of ${peakSent.toLocaleString("en-US")} emails`

  switch (change) {
    case "peak_raised":
      return `📈 Bounce rate rose to ${peak} in the last hour (${peakEmails}).`
    case "escalated":
      return `🔴 **Escalated from warning to critical.** Bounce rate reached ${peak} in the last hour (${peakEmails}).`
    case "resolved": {
      const recoveredAt =
        incident.recoveredAt ?? incident.resolvedAt ?? new Date()
      const durationMinutes = Math.max(
        1,
        Math.round((recoveredAt.getTime() - openedAt.getTime()) / 60_000)
      )
      const durationHours = Math.floor(durationMinutes / 60)

      // Resolving stores the affected counts; the fallbacks only satisfy the nullable columns.
      return [
        "✅ **Resolved.** Bounce rate stayed below threshold for 30 minutes.",
        `**Duration:** ${durationHours > 0 ? `${durationHours}h ${durationMinutes % 60}m` : `${durationMinutes}m`}`,
        `**Peak:** ${peak} in one hour (${peakEmails})`,
        `**Affected:** ${(affectedBounced ?? 0).toLocaleString("en-US")} of ${(affectedSent ?? 0).toLocaleString("en-US")} emails bounced`
      ].join("\n")
    }
  }
}
