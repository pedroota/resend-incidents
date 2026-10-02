import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

export const env = createEnv({
  client: {
    VITE_NODE_ENV: z
      .enum(["development", "production", "local"])
      .default("local"),
    VITE_API_URL: z.url()
  },
  clientPrefix: "VITE_",
  runtimeEnvStrict: {
    VITE_NODE_ENV: import.meta.env.VITE_NODE_ENV,
    VITE_API_URL: import.meta.env.VITE_API_URL
  },
  emptyStringAsUndefined: true
})
