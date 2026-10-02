import { createJobQueue } from "./job-queue"

// No domain imports here, to avoid circular dependencies; processors are wired in `index.ts`.
export const jobsQueue = createJobQueue("resend-incidents-jobs")

// Own queue so slow or rate-limited destinations never hold up detection.
export const alertsQueue = createJobQueue("resend-incidents-alerts", {
  concurrency: 5
})
