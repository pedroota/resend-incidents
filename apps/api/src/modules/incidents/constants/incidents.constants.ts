export const DETECTION_INTERVAL_MS = 5 * 60_000

// Fans out one detection job per connected installation.
export const INCIDENT_DETECTION_SCAN_JOB = "incident-detection.scan"
export const INCIDENT_DETECTION_JOB = "incident-detection"
export const INCIDENT_ALERT_DELIVERY_JOB = "incident-alert.delivery"
export const INCIDENT_UPDATE_DELIVERY_JOB = "incident-update.delivery"

export const INCIDENT_RECOVERY_MS = 30 * 60_000

export const DETECTION_WINDOW_MS = 60 * 60_000

export const BOUNCE_MIN_SENT = 50

// Fractions of sent emails that bounced.
export const BOUNCE_WARNING_RATE = 0.02
export const BOUNCE_CRITICAL_RATE = 0.03

// Above this Resend may pause sending for the account.
export const RESEND_PAUSE_BOUNCE_RATE = 0.04

// "Open in Resend" links into the dashboard, not the API.
export const RESEND_DASHBOARD_URL = "https://resend.com"
