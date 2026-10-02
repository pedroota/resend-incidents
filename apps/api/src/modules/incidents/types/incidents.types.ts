export type IncidentType = "bounce_spike"

export type IncidentSeverity = "warning" | "critical"

// What a destination update reports in the incident's thread.
export type IncidentChange = "peak_raised" | "escalated" | "resolved"

export interface BounceCounts {
  sent: number
  bounced: number
}

// A domain's detection window.
export interface DomainWindow extends BounceCounts {
  domain: string
}

export interface BounceSpike {
  severity: IncidentSeverity
  // Fraction of sent emails, e.g. 0.052.
  rate: number
}
