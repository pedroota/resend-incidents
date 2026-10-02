import { z } from "zod"

// `since` is fixed by the scan, so a retried job judges the same window.
export const incidentDetectionJobDto = z.object({
  installationId: z.uuid(),
  since: z.iso.datetime()
})
