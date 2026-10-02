import { EdenFetchError } from "@elysiajs/eden"
import { useMutation, useQuery, useSuspenseQuery } from "@tanstack/react-query"
import {
  createFileRoute,
  type ErrorComponentProps,
  useRouter
} from "@tanstack/react-router"
import { Button } from "@resend-incidents/ui/components/button"
import { Card } from "@resend-incidents/ui/components/card"
import { Icons } from "@resend-incidents/ui/components/icons"
import {
  destinationKeys,
  listDestinations
} from "@/features/destinations/services/destination-service"
import {
  getInstallationWebhook,
  installationKeys,
  listInstallationDomains,
  setUpInstallationWebhook
} from "@/features/installations/services/installation-service"
import { CONNECT_RESEND_URL, INSTALL_DISCORD_URL } from "@/lib/oauth"

const WEBHOOK_STATUS_LABELS = {
  active: "active",
  disabled: "disabled",
  missing: "not set up"
} as const

export const Route = createFileRoute("/_authenticated/connected")({
  loader: ({ context }) =>
    context.queryClient.query({
      queryKey: installationKeys.domains(),
      queryFn: listInstallationDomains,
      staleTime: "static"
    }),
  component: Connected,
  errorComponent: ConnectedError
})

function Connected() {
  const { data } = useSuspenseQuery({
    queryKey: installationKeys.domains(),
    queryFn: listInstallationDomains
  })
  const { queryClient } = Route.useRouteContext()
  const webhook = useQuery({
    queryKey: installationKeys.webhook(),
    queryFn: getInstallationWebhook
  })
  const destinations = useQuery({
    queryKey: destinationKeys.list(),
    queryFn: listDestinations
  })
  const setUpWebhook = useMutation({
    mutationFn: setUpInstallationWebhook,
    onSuccess: (webhookStatus) => {
      queryClient.setQueryData(installationKeys.webhook(), webhookStatus)
    }
  })

  return (
    <>
      <section className="space-y-7">
        <div className="flex size-9 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
          <Icons.LayoutGrid className="size-4" />
        </div>
        <h1 className="font-mono text-[13px] tracking-[0.2em] text-zinc-600 uppercase">
          Account connected
        </h1>

        <p className="text-lg leading-[1.75] font-light tracking-[-0.01em] text-zinc-100">
          Done. Your Resend team is connected and we are already watching your
          domains.
        </p>

        <p className="text-sm leading-[1.85] text-muted-foreground">
          Only verified domains send email, so only they can open incidents.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="font-mono text-[10px] tracking-[0.2em] text-zinc-600 uppercase">
          Domains found
        </h2>
        {data.domains.length === 0 ? (
          <p className="text-sm leading-[1.85] text-muted-foreground">
            No domains in this Resend team yet. Add one on Resend and it will
            show up here.
          </p>
        ) : (
          <Card className="gap-0 py-0">
            <ul className="divide-y">
              {data.domains.map((domain) => (
                <li
                  key={domain.id}
                  className="flex items-center justify-between px-5 py-4 text-[13px]"
                >
                  <span className="font-mono">{domain.name}</span>
                  <span
                    className={
                      domain.status === "verified"
                        ? "flex items-center gap-2 text-zinc-300"
                        : "flex items-center gap-2 text-zinc-600"
                    }
                  >
                    <Icons.CircleDot className="size-3" />
                    {domain.status}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
      <section className="space-y-3">
        <h2 className="font-mono text-[10px] tracking-[0.2em] text-zinc-600 uppercase">
          Resend webhook
        </h2>
        {webhook.isPending ? (
          <p className="text-sm leading-[1.85] text-muted-foreground">
            Checking webhook…
          </p>
        ) : null}
        {webhook.isError ? (
          <p className="text-sm leading-[1.85] text-muted-foreground">
            We could not check your webhook on Resend right now.
          </p>
        ) : null}
        {webhook.data ? (
          <Card className="gap-0 py-0">
            <div className="space-y-3 px-5 py-4">
              <div className="flex items-center justify-between gap-4 text-[13px]">
                <span className="font-mono">Email events</span>
                <span
                  className={
                    webhook.data.status === "active"
                      ? "flex items-center gap-2 text-zinc-300"
                      : "flex items-center gap-2 text-zinc-600"
                  }
                >
                  <Icons.CircleDot className="size-3" />
                  {WEBHOOK_STATUS_LABELS[webhook.data.status]}
                </span>
              </div>
              {webhook.data.status === "active" ? (
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  Resend sends us sent and bounced events. We keep only counts
                  per domain.
                </p>
              ) : null}
              {webhook.data.status === "disabled" ? (
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  Resend disabled this webhook. Enable it again under Webhooks
                  on Resend.
                </p>
              ) : null}
              {webhook.data.status === "missing" ? (
                <div className="flex items-center justify-between gap-4">
                  <p className="text-[13px] leading-relaxed text-muted-foreground">
                    {setUpWebhook.isError
                      ? "Resend did not respond. Try again in a few seconds."
                      : "We could not create the webhook on Resend yet."}
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={setUpWebhook.isPending}
                    onClick={() => setUpWebhook.mutate()}
                  >
                    <Icons.RotateCw />
                    {setUpWebhook.isPending ? "Setting up…" : "Set up"}
                  </Button>
                </div>
              ) : null}
            </div>
          </Card>
        ) : null}
      </section>
      <section className="space-y-3">
        <h2 className="font-mono text-[10px] tracking-[0.2em] text-zinc-600 uppercase">
          Where alerts go
        </h2>
        {destinations.isPending ? (
          <p className="text-sm leading-[1.85] text-muted-foreground">
            Loading destinations…
          </p>
        ) : null}
        {destinations.isError ? (
          <p className="text-sm leading-[1.85] text-muted-foreground">
            We could not load your destinations right now.
          </p>
        ) : null}
        {destinations.data?.destinations.length === 0 ? (
          <div className="space-y-5">
            <p className="text-sm leading-[1.85] text-muted-foreground">
              Add the bot to your Discord server and pick a channel, for example{" "}
              <code className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs text-zinc-300">
                #email-incidents
              </code>
              . Incidents are posted there.
            </p>
            <Button asChild size="xl" className="group w-full justify-between">
              <a href={INSTALL_DISCORD_URL}>
                <Icons.Hash />
                Add to Discord
                <Icons.ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </a>
            </Button>
          </div>
        ) : null}
        {destinations.data && destinations.data.destinations.length > 0 ? (
          <Card className="gap-0 py-0">
            <ul className="divide-y">
              {destinations.data.destinations.map((destination) => (
                <li
                  key={destination.id}
                  className="px-5 py-4 font-mono text-[13px]"
                >
                  {destination.name}
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </section>
    </>
  )
}

function ConnectedError({ error, reset }: ErrorComponentProps) {
  const router = useRouter()

  if (error instanceof EdenFetchError && error.status === 401) {
    return (
      <section className="space-y-7">
        <div className="flex size-9 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
          <Icons.TriangleAlert className="size-4" />
        </div>
        <h1 className="font-mono text-[13px] tracking-[0.2em] text-zinc-600 uppercase">
          Not connected
        </h1>
        <p className="text-lg leading-[1.75] font-light tracking-[-0.01em] text-zinc-100">
          Your account has no Resend team connected yet.
        </p>
        <Button asChild size="xl" className="group w-full justify-between">
          <a href={CONNECT_RESEND_URL}>
            <Icons.RotateCw />
            Connect Resend
            <Icons.ArrowRight className="transition-transform group-hover:translate-x-0.5" />
          </a>
        </Button>
      </section>
    )
  }

  return (
    <>
      <section className="space-y-7">
        <div className="flex size-9 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
          <Icons.LayoutGrid className="size-4" />
        </div>
        <h1 className="font-mono text-[13px] tracking-[0.2em] text-zinc-600 uppercase">
          Account connected
        </h1>

        <p className="text-lg leading-[1.75] font-light tracking-[-0.01em] text-zinc-100">
          Done. Your Resend team is connected and we are already watching your
          domains.
        </p>

        <p className="text-sm leading-[1.85] text-muted-foreground">
          Only verified domains send email, so only they can open incidents.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="font-mono text-[10px] tracking-[0.2em] text-zinc-600 uppercase">
          Domains found
        </h2>
        <p className="text-sm leading-[1.85] text-muted-foreground">
          We could not load your domains from Resend right now.{" "}
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
      </section>
    </>
  )
}
