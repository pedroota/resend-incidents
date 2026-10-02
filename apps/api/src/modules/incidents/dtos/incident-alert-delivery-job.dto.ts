import { z } from "zod"

export const incidentAlertDeliveryJobDto = z.object({
  incidentId: z.uuid(),
  destinationId: z.uuid()
})
