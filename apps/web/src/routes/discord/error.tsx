import { createFileRoute, Link } from "@tanstack/react-router"
import { Button } from "@resend-incidents/ui/components/button"
import { Icons } from "@resend-incidents/ui/components/icons"
import { z } from "zod"
import { CONNECT_RESEND_URL, INSTALL_DISCORD_URL } from "@/lib/oauth"

const searchSchema = z.object({
  reason: z
    .enum(["access_denied", "invalid_state", "not_connected", "unknown"])
    .catch("unknown")
})

export const Route = createFileRoute("/discord/error")({
  validateSearch: searchSchema,
  component: DiscordError
})

const COPY = {
  access_denied: {
    label: "Bot not added",
    headline:
      "You cancelled adding the bot on Discord. Nothing was installed in your server.",
    body: "Alerts need a channel to land in. Add the bot when you are ready."
  },
  invalid_state: {
    label: "Session expired",
    headline:
      "We could not confirm this install started here, so we discarded it for your safety.",
    body: "This happens when the link stays open too long or is opened in another tab. Add the bot again."
  },
  not_connected: {
    label: "Not connected",
    headline: "Connect your Resend account before adding Discord.",
    body: "The bot posts incidents for a Resend team, so we need that connection first."
  },
  unknown: {
    label: "Something went wrong",
    headline: "Adding the bot to Discord failed before it finished.",
    body: "Try again in a few seconds. If the error persists, Discord may be having issues."
  }
} as const

function DiscordError() {
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
          <a
            href={
              reason === "not_connected"
                ? CONNECT_RESEND_URL
                : INSTALL_DISCORD_URL
            }
          >
            <Icons.RotateCw />
            {reason === "not_connected" ? "Connect Resend" : "Try again"}
            <Icons.ArrowRight className="transition-transform group-hover:translate-x-0.5" />
          </a>
        </Button>
        {reason !== "not_connected" ? (
          <Button
            asChild
            variant="secondary"
            size="xl"
            className="group w-full justify-between"
          >
            <Link to="/connected">
              <span aria-hidden className="size-4" />
              Back to your account
              <Icons.ArrowRight className="text-zinc-600 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        ) : null}
      </section>
    </>
  )
}
