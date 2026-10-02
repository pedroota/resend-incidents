import { useMutation, useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Button } from "@resend-incidents/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader
} from "@resend-incidents/ui/components/card"
import { Icons } from "@resend-incidents/ui/components/icons"
import { authClient, authKeys, getSession } from "@/lib/auth-client"

export const Route = createFileRoute("/")({
  component: Index
})

const READS = [
  "Domains and their verification status",
  "Sent and bounced email events, to count them per domain"
]

const NEVER = [
  "Send email on your behalf",
  "Store email content, only counts",
  "Change DNS, domains or API keys",
  "Resend emails or delete data"
]

const STEPS = [
  {
    label: "01 · Sign in",
    desc: "Use your GitHub account. No password to create."
  },
  {
    label: "02 · Connect",
    desc: "You authorize on Resend. No API key to paste."
  },
  {
    label: "03 · Watch",
    desc: "We create a webhook in your account that points to the app."
  },
  {
    label: "04 · Alert",
    desc: "A bounce spike becomes an incident in your channel."
  }
]

function Index() {
  const session = useQuery({
    queryKey: authKeys.session(),
    queryFn: getSession
  })
  const signIn = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.signIn.social({
        provider: "github",
        callbackURL: `${window.location.origin}/connected`,
        errorCallbackURL: window.location.origin
      })

      if (error) {
        throw error
      }
    }
  })

  return (
    <>
      {/* Introduction */}
      <section className="space-y-7">
        <div className="flex size-9 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
          <Icons.LayoutGrid className="size-4" />
        </div>
        <h1 className="font-mono text-[13px] tracking-[0.2em] text-zinc-600 uppercase">
          Resend Incidents
        </h1>

        <p className="text-lg leading-[1.75] font-light tracking-[-0.01em] text-zinc-100">
          Know when production email starts failing, before your customers do.
          Connect your{" "}
          <img
            src="/brand/resend-wordmark-white.svg"
            alt="Resend"
            className="inline h-[0.7em] w-auto align-baseline"
          />{" "}
          account in under 2 minutes.
        </p>

        <p className="text-sm leading-[1.85] text-muted-foreground">
          We watch your email events and open an incident when a domain's bounce
          rate spikes, before Resend's 4% pause threshold.
        </p>

        <div className="space-y-5 pt-2">
          {session.data ? (
            <Button asChild size="xl" className="group w-full justify-between">
              <Link to="/connected">
                <Icons.LayoutGrid className="size-5" />
                Go to your account
                <Icons.ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          ) : (
            <Button
              size="xl"
              className="group w-full justify-between"
              disabled={signIn.isPending}
              onClick={() => signIn.mutate()}
            >
              <Icons.GitHub className="size-5" />
              {signIn.isPending ? "Redirecting…" : "Get started with GitHub"}
              <Icons.ArrowRight className="transition-transform group-hover:translate-x-0.5" />
            </Button>
          )}

          {signIn.isError ? (
            <p className="text-center text-sm leading-[1.85] text-muted-foreground">
              GitHub sign-in did not start. Try again in a few seconds.
            </p>
          ) : null}

          <p className="text-center font-mono text-[11px] tracking-[0.15em] text-zinc-700 uppercase">
            OAuth 2.1 · PKCE · no API key ·{" "}
            <a
              href="#access"
              className="whitespace-nowrap text-zinc-500 underline-offset-4 transition-colors hover:text-zinc-300 hover:underline"
            >
              What we access
            </a>
          </p>
        </div>
      </section>

      <hr />

      {/* How it works */}
      <section className="space-y-7">
        <div className="flex size-9 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
          <Icons.CircleDot className="size-4" />
        </div>
        <h2 className="font-mono text-[13px] tracking-[0.2em] text-zinc-600 uppercase">
          How it works
        </h2>

        <div className="space-y-3">
          {STEPS.map(({ label, desc }) => (
            <Card
              key={label}
              className="group transition-colors hover:border-white/10 hover:bg-white/4"
            >
              <CardHeader className="font-mono text-xs tracking-[0.15em] text-zinc-500 uppercase transition-colors group-hover:text-zinc-400">
                {label}
              </CardHeader>
              <CardContent className="text-sm/relaxed">{desc}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <hr />

      {/* Consent explainer */}
      <section id="access" className="scroll-mt-10 space-y-7">
        <div className="flex size-9 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
          <Icons.ShieldCheck className="size-4" />
        </div>
        <h2 className="font-mono text-[13px] tracking-[0.2em] text-zinc-600 uppercase">
          What the app accesses
        </h2>

        <p className="text-sm leading-[1.85] text-muted-foreground">
          Resend offers only two OAuth scopes:{" "}
          <code className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs text-zinc-300">
            emails:send
          </code>{" "}
          and{" "}
          <code className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs text-zinc-300">
            full_access
          </code>
          . Monitoring requires the second one, so we ask for full access. Here
          is exactly what we do with it:
        </p>

        <Card className="grid grid-cols-1 gap-0 overflow-hidden py-0 backdrop-blur-sm sm:grid-cols-2">
          <div className="border-b sm:border-r sm:border-b-0">
            <h3 className="px-5 py-3 font-mono text-[10px] tracking-[0.2em] text-zinc-600 uppercase">
              What we read
            </h3>
            <ul className="space-y-3 border-t p-5">
              {READS.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-[13px] leading-relaxed"
                >
                  <span className="mt-0.75 flex size-4 shrink-0 items-center justify-center rounded-full bg-accent text-zinc-300">
                    <Icons.Check className="size-2.5" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="px-5 py-3 font-mono text-[10px] tracking-[0.2em] text-zinc-600 uppercase">
              What we never do
            </h3>
            <ul className="space-y-3 border-t p-5">
              {NEVER.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-[13px] leading-relaxed"
                >
                  <span className="mt-0.75 flex size-4 shrink-0 items-center justify-center rounded-full bg-muted text-zinc-600">
                    <Icons.X className="size-2.5" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <p className="text-sm leading-[1.85] text-muted-foreground">
          The only write to your account is creating a webhook that points to
          the app. Tokens are encrypted at rest and revoked when you disconnect.
        </p>
      </section>
    </>
  )
}
