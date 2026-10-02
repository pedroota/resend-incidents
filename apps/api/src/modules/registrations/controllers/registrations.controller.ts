import { Elysia } from "elysia"
import { registrationsService } from "@api/modules/registrations/services/registrations.service"

export const registrationsController = new Elysia({
  prefix: "/registrations"
}).get("/", async () => {
  const { registered, limit } = await registrationsService.getStatus()

  return { registered, limit }
})
