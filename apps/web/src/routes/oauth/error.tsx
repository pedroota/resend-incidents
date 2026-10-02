import { createFileRoute, Link } from "@tanstack/react-router"
import { Button } from "@resend-incidents/ui/components/button"
import { Icons } from "@resend-incidents/ui/components/icons"
import { z } from "zod"
import { CONNECT_RESEND_URL } from "@/lib/oauth"

const searchSchema = z.object({
  reason: z.enum(["access_denied", "invalid_state", "unknown"]).catch("unknown")
})

export const Route = createFileRoute("/oauth/error")({
  validateSearch: searchSchema,
  component: OAuthError
})

const COPY = {
  access_denied: {
    label: "Access denied",
    headline:
      "You cancelled the authorization on Resend. Nothing was connected and no data was read.",
    body: "If that was a mistake, try again. If you have questions about the access we ask for, see what the app reads and what it never does."
  },
  invalid_state: {
    label: "Session expired",
    headline:
      "We could not confirm this authorization started here, so we discarded it for your safety.",
    body: "This happens when the link stays open too long or is opened in another tab. Start the connection again."
  },
  unknown: {
    label: "Something went wrong",
    headline:
      "The connection to Resend failed before it finished. Nothing was saved.",
    body: "Try again in a few seconds. If the error persists, Resend may be having issues."
  }
} as const

function OAuthError() {
  const { reason } = Route.useSearch()
  const copy = COPY[reason]

  return (
    <>
      <section className="space-y-7">
        <div className="flex size-9 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
          <Icons.TriangleAlert className="size-4" />
        </div>
        <h1 className="font-mono text-[13px] tracking-[0.2em] text-zinc-600 uppercase">
          {copy.label}
        </h1>
        <p className="text-lg leading-[1.75] font-light tracking-[-0.01em] text-zinc-100">
          {copy.headline}
        </p>
        <p className="text-sm leading-[1.85] text-muted-foreground">
          {copy.body}
        </p>
      </section>

      <section className="space-y-3 pt-4">
        <Button asChild size="xl" className="group w-full justify-between">
          <a href={CONNECT_RESEND_URL}>
            <Icons.RotateCw />
            Try again
            <Icons.ArrowRight className="transition-transform group-hover:translate-x-0.5" />
          </a>
        </Button>
        <Button
          asChild
          variant="secondary"
          size="xl"
          className="group w-full justify-between"
        >
          <Link to="/" hash="access">
            <span aria-hidden className="size-4" />
            See what the app accesses
            <Icons.ArrowRight className="text-zinc-600 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Button>
      </section>
    </>
  )
}
