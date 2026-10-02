import type { QueryClient } from "@tanstack/react-query"
import {
  QueryClientProvider,
  useMutation,
  useQuery
} from "@tanstack/react-query"
import {
  createRootRouteWithContext,
  Link,
  Outlet,
  useNavigate
} from "@tanstack/react-router"
import { ReactLenis } from "lenis/react"
import { Icons } from "@resend-incidents/ui/components/icons"
import { authClient, authKeys, getSession } from "@/lib/auth-client"

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: Root
})

function Root() {
  const { queryClient } = Route.useRouteContext()
  const navigate = useNavigate()
  const session = useQuery(
    { queryKey: authKeys.session(), queryFn: getSession },
    queryClient
  )
  const signOut = useMutation(
    {
      mutationFn: async () => {
        const { error } = await authClient.signOut()

        if (error) {
          throw error
        }
      },
      onSuccess: async () => {
        queryClient.clear()
        await navigate({ to: "/", replace: true })
      }
    },
    queryClient
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ReactLenis
        root
        options={{
          duration: 1.2,
          easing: (t) => Math.min(1, 1.001 - 2 ** (-10 * t)),
          smoothWheel: true,
          touchMultiplier: 1.5,
          anchors: true
        }}
      >
        <div className="min-h-dvh">
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(255,255,255,0.04)_0%,transparent_70%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle,rgba(255,255,255,0.35)_1px,transparent_1px)] bg-size-[28px_28px] opacity-[0.15]"
          />

          <nav className="relative z-10 flex items-center justify-between border-b border-white/4 px-8 py-7">
            <Link
              to="/"
              className="flex items-center gap-3 font-mono text-[11px] tracking-[0.3em] text-zinc-500 uppercase transition-colors select-none hover:text-zinc-300"
            >
              {/* Official Resend asset from https://resend.com/brand, rendered as-is per the guidelines. */}
              <img
                src="/brand/resend-icon-white.svg"
                alt=""
                aria-hidden
                className="size-6"
              />
              Resend Incidents
            </Link>
            <div className="flex items-center gap-6">
              <a
                href="https://resend.com"
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[11px] tracking-[0.15em] text-zinc-600 uppercase transition-colors hover:text-zinc-300"
              >
                resend.com
              </a>
              {session.data ? (
                <button
                  type="button"
                  disabled={signOut.isPending}
                  onClick={() => signOut.mutate()}
                  className="flex items-center gap-2 font-mono text-[11px] tracking-[0.15em] text-zinc-600 uppercase transition-colors hover:text-zinc-300"
                >
                  <Icons.LogOut className="size-3" />
                  Sign out
                </button>
              ) : null}
            </div>
          </nav>

          <main className="relative z-10 mx-auto max-w-130 space-y-18 px-8 pt-20 pb-40">
            <Outlet />
          </main>
        </div>
      </ReactLenis>
    </QueryClientProvider>
  )
}
