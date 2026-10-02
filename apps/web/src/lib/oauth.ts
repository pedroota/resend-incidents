import { env } from "./env"

// Server route that generates the PKCE verifier + state and redirects to Resend's consent screen.
export const CONNECT_RESEND_URL = `${env.VITE_API_URL}/oauth/resend/authorize`

// Server route that redirects to Discord's bot install screen.
export const INSTALL_DISCORD_URL = `${env.VITE_API_URL}/oauth/discord/authorize`
