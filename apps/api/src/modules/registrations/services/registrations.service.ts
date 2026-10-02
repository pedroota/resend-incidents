import { env } from "@api/common/env/environment"
import { registrationsRepository } from "@api/modules/registrations/repositories/registrations.repository"

async function getStatus() {
  const registered = await registrationsRepository.countRegisteredUsers()

  return {
    registered,
    limit: env.MAX_USERS,
    isFull: registered >= env.MAX_USERS
  }
}

export const registrationsService = { getStatus }
