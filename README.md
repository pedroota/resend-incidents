# resend-incidents

Bun monorepo:

- `apps/api` — [Elysia](https://elysiajs.com) API (port 3333)
- `apps/web` (port 3000) — Vite + React + [TanStack Router](https://tanstack.com/router) (file-based routes), talks to the API via [Eden Treaty](https://elysiajs.com/eden/treaty/overview)

```bash
bun install
bun run dev        # api + web
bun run dev:api
bun run dev:web
bun run typecheck
```

The web app imports the API's `App` type via the `@api/*` tsconfig path (type-only), so API changes are type-checked end to end. Set `VITE_API_URL` in `apps/web/.env` to point at a different API.

## Signing in (GitHub)

Users sign in with GitHub through [Better Auth](https://better-auth.com), mounted at `/api/auth`. Each Resend installation belongs to the user who connected it, so connecting Resend and adding Discord require a session.

Create an OAuth app at https://github.com/settings/developers with callback URL `http://localhost:3333/api/auth/callback/github`, then set `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` and `AUTH_SECRET` (`openssl rand -base64 48`) in `apps/api/.env`.

## Connecting Resend (OAuth)

The API is a public OAuth 2.1 client (PKCE, no secret). Register it once and put the returned `client_id` in `apps/api/.env` as `RESEND_CLIENT_ID`:

```bash
curl -X POST https://api.resend.com/oauth/register \
  -H 'content-type: application/json' \
  -d '{
    "client_name": "Resend Incidents (local)",
    "redirect_uris": ["http://localhost:3333/oauth/resend/callback"],
    "grant_types": ["authorization_code", "refresh_token"],
    "response_types": ["code"],
    "token_endpoint_auth_method": "none",
    "scope": "full_access"
  }'
```

Also set `COOKIE_SECRET` (`openssl rand -base64 48`) and `TOKEN_ENCRYPTION_KEY` (`openssl rand -base64 32`). Access and refresh tokens are stored AES-256-GCM encrypted with that key. Apply migrations with `bun run --filter @resend-incidents/api db:migrate`.

## Adding Discord (bot)

Create an application at https://discord.com/developers/applications, then in `apps/api/.env`:

- `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET`: **OAuth2** page.
- `DISCORD_BOT_TOKEN`: **Bot** page → Reset Token.
- **OAuth2 → Redirects**: add `http://localhost:3333/oauth/discord/callback`.

Alerts carry a single "Open in Resend" link button. Peak raises, escalations and the closing summary edit the alert and go to its thread.

"Add to Discord" installs the bot with the `bot` scope (View Channel, Send Messages, Embed Links, Read Message History). The code exchange tells us which server it joined; that server is linked to the installation. The bot token is one per application (Discord has no per-server bot tokens), so it lives in env, not in the database.
