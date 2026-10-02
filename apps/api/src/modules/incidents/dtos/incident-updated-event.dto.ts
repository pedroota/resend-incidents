import { z } from "zod"

export const incidentChangeDto = z.enum([
  "peak_raised",
  "escalated",
  "resolved"
])

// `occurredAt` tells repeated changes of the same kind apart.
export const incidentUpdatedEventDto = z.object({
  incidentId: z.uuid(),
  change: incidentChangeDto,
  occurredAt: z.iso.datetime()
})
