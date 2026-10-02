import { Elysia } from "elysia"
import { auth } from "@api/modules/auth/auth.client"
import { installationsRepository } from "@api/modules/installations/repositories/installations.repository"

export const betterAuth = new Elysia({ name: "better-auth" })
  .mount("/api", auth.handler)
  // Signed-in user plus their connected Resend installation.
  .macro("installation", {
    async resolve({ request, status }) {
      const session = await auth.api.getSession({ headers: request.headers })

      if (!session) {
        return status(401, { error: "unauthenticated" as const })
      }

      const installationId =
        await installationsRepository.findConnectedIdByUserId(session.user.id)

      if (!installationId) {
        return status(401, { error: "not_connected" as const })
      }

      return { user: session.user, installationId }
    }
  })
