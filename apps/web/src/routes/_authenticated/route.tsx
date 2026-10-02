import { createFileRoute, redirect } from "@tanstack/react-router"
import { authKeys, getSession } from "@/lib/auth-client"

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context: { queryClient } }) => {
    const session = await queryClient.query({
      queryKey: authKeys.session(),
      queryFn: getSession,
      staleTime: 1000 * 60 * 5
    })

    if (!session) {
      throw redirect({ to: "/", replace: true })
    }

    return { session }
  }
})
