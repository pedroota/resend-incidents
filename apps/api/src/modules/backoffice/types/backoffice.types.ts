import type { z } from "zod"
import type { simulateBounceSpikeDto } from "@api/modules/backoffice/dtos/simulate-bounce-spike.dto"

export type SimulateBounceSpikeInput = z.infer<typeof simulateBounceSpikeDto>

export type SimulateBounceSpikeResult =
  | {
      success: true
      installationId: string
      domain: string
      sent: number
      bounced: number
    }
  | { success: false; error: "installation_not_found" }
