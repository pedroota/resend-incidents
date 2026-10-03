import { Elysia } from "elysia"
import { statesMatch } from "@api/common/crypto/states-match"
import { env } from "@api/common/env/environment"
import {
  backofficeHeadersDto,
  simulateBounceSpikeDto
} from "@api/modules/backoffice/dtos/simulate-bounce-spike.dto"
import { backofficeService } from "@api/modules/backoffice/services/backoffice.service"

export const backofficeController = new Elysia({ prefix: "/backoffice" })
  .onBeforeHandle(({ headers, status }) => {
    if (!env.BACKOFFICE_API_KEY) {
      return status(404, { error: "not_found" as const })
    }

    const receivedKey = headers["x-api-key"]

    if (!receivedKey || !statesMatch(env.BACKOFFICE_API_KEY, receivedKey)) {
      return status(401, { error: "invalid_api_key" as const })
    }
  })
  .post(
    "/simulations/bounce-spike",
    async ({ body, status }) => {
      const result = await backofficeService.simulateBounceSpike(body)

      if (!result.success) {
        return status(404, { error: result.error })
      }

      return {
        installationId: result.installationId,
        domain: result.domain,
        sent: result.sent,
        bounced: result.bounced
      }
    },
    { body: simulateBounceSpikeDto, headers: backofficeHeadersDto }
  )
