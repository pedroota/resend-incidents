import { z } from "zod"

export const incidentOpenedEventDto = z.object({ incidentId: z.uuid() })
