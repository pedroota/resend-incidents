import { z } from "zod"
import { incidentChangeDto } from "./incident-updated-event.dto"

export const incidentUpdateDeliveryJobDto = z.object({
  incidentId: z.uuid(),
  destinationId: z.uuid(),
  change: incidentChangeDto
})
