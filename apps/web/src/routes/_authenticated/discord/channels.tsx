import { useMutation, useQuery, useSuspenseQuery } from "@tanstack/react-query"
import {
  createFileRoute,
  type ErrorComponentProps,
  useNavigate,
  useRouter
} from "@tanstack/react-router"
import { Button } from "@resend-incidents/ui/components/button"
import { Card } from "@resend-incidents/ui/components/card"
import { Icons } from "@resend-incidents/ui/components/icons"
import {
  addDiscordDestination,
  destinationKeys,
  listDestinations,
  listDiscordChannels
} from "@/features/destinations/services/destination-service"
import { apiErrorCode, knownApiErrorCode } from "@/lib/http-client"
import { CONNECT_RESEND_URL, INSTALL_DISCORD_URL } from "@/lib/oauth"

export const Route = createFileRoute("/_authenticated/discord/channels")({
  loader: ({ context }) =>
    context.queryClient.query({
      queryKey: destinationKeys.discordChannels(),
      queryFn: listDiscordChannels
    }),
  component: DiscordChannels,
  errorComponent: DiscordChannelsError
})

const ADD_ERRORS = {
  channel_not_found:
    "That channel is no longer in the server. Refresh the list and pick another one.",
  bot_not_in_server:
    "The bot is no longer in this server. Add it again to pick a channel.",
  discord_unavailable: "Discord did not respond. Try again in a few seconds."
} as const

function DiscordChannels() {
  const { data } = useSuspenseQuery({
    queryKey: destinationKeys.discordChannels(),
    queryFn: listDiscordChannels
  })
  const destinations = useQuery({
    queryKey: destinationKeys.list(),
    queryFn: listDestinations
  })
  const { queryClient } = Route.useRouteContext()
  const navigate = useNavigate()
  const currentChannelId = destinations.data?.destinations[0]?.channelId

  const addDestination = useMutation({
    mutationFn: addDiscordDestination,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: destinationKeys.all })
      await navigate({ to: "/connected" })
    }
  })

  return (
    <>
      <section className="space-y-7">
        <div className="flex size-9 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
          <Icons.Hash className="size-4" />
        </div>
        <h1 className="font-mono text-[13px] tracking-[0.2em] text-zinc-600 uppercase">
          Choose a channel
        </h1>
        <p className="text-lg leading-[1.75] font-light tracking-[-0.01em] text-zinc-100">
          The bot is in {data.guild.name}. Pick the channel where incidents
          should land.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="font-mono text-[10px] tracking-[0.2em] text-zinc-600 uppercase">
          Text channels
        </h2>
        {data.channels.length === 0 ? (
          <p className="text-sm leading-[1.85] text-muted-foreground">
            The bot cannot see any text channel in this server. Give it access
            to a channel on Discord, then refresh this page.
          </p>
        ) : (
          <Card className="gap-0 py-0">
            <ul className="divide-y">
              {data.channels.map((channel) => (
                <li key={channel.id}>
                  <button
                    type="button"
                    disabled={addDestination.isPending}
                    onClick={() => addDestination.mutate(channel.id)}
                    className="group flex w-full items-center justify-between px-5 py-4 text-left text-[13px] transition-colors hover:bg-white/4 disabled:opacity-50"
                  >
                    <span className="flex items-center gap-2 font-mono">
                      <Icons.Hash className="size-3.5 text-zinc-600" />
                      {channel.name}
                    </span>
                    {channel.id === currentChannelId ? (
                      <span className="flex items-center gap-1.5 font-mono text-[11px] tracking-[0.15em] text-zinc-500 uppercase">
                        <Icons.Check className="size-3.5" />
                        Current
                      </span>
                    ) : (
                      <Icons.ArrowRight className="size-4 text-zinc-600 transition-transform group-hover:translate-x-0.5" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )}
        {addDestination.error ? (
          <p role="alert" className="text-sm leading-[1.85] text-zinc-300">
            {
              ADD_ERRORS[
                knownApiErrorCode(
                  addDestination.error,
                  ADD_ERRORS,
                  "discord_unavailable"
                )
              ]
            }
          </p>
        ) : null}
      </section>
    </>
  )
}

function DiscordChannelsError({ error, reset }: ErrorComponentProps) {
  const router = useRouter()
  const code = error instanceof Error ? apiErrorCode(error) : null

  if (code === "not_connected") {
    return (
      <>
        <section className="space-y-7">
          <div className="flex size-9 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
            <Icons.Hash className="size-4" />
          </div>
          <h1 className="font-mono text-[13px] tracking-[0.2em] text-zinc-600 uppercase">
            Choose a channel
          </h1>
          <p className="text-lg leading-[1.75] font-light tracking-[-0.01em] text-zinc-100">
            Your account has no Resend team connected yet.
          </p>
        </section>
        <Button asChild size="xl" className="group w-full justify-between">
          <a href={CONNECT_RESEND_URL}>
            <Icons.RotateCw />
            Connect Resend
            <Icons.ArrowRight className="transition-transform group-hover:translate-x-0.5" />
          </a>
        </Button>
      </>
    )
  }

  if (code === "discord_not_installed" || code === "bot_not_in_server") {
    return (
      <>
        <section className="space-y-7">
          <div className="flex size-9 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
            <Icons.Hash className="size-4" />
          </div>
          <h1 className="font-mono text-[13px] tracking-[0.2em] text-zinc-600 uppercase">
            Choose a channel
          </h1>
          <p className="text-lg leading-[1.75] font-light tracking-[-0.01em] text-zinc-100">
            {code === "discord_not_installed"
              ? "Add the bot to your Discord server first."
              : "The bot is no longer in your Discord server. Add it again to pick a channel."}
          </p>
        </section>
        <Button asChild size="xl" className="group w-full justify-between">
          <a href={INSTALL_DISCORD_URL}>
            <Icons.Hash />
            Add to Discord
            <Icons.ArrowRight className="transition-transform group-hover:translate-x-0.5" />
          </a>
        </Button>
      </>
    )
  }

  return (
    <>
      <section className="space-y-7">
        <div className="flex size-9 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
          <Icons.Hash className="size-4" />
        </div>
        <h1 className="font-mono text-[13px] tracking-[0.2em] text-zinc-600 uppercase">
          Choose a channel
        </h1>
        <p className="text-lg leading-[1.75] font-light tracking-[-0.01em] text-zinc-100">
          We could not load your Discord channels right now.
        </p>
      </section>
      <p className="text-sm leading-[1.85] text-muted-foreground">
        Discord may be having issues.{" "}
        <button
          type="button"
          onClick={() => {
            reset()
            router.invalidate()
          }}
          className="underline"
        >
          Try again
        </button>
        .
      </p>
    </>
  )
}
