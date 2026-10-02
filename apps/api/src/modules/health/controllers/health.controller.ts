import { Elysia } from "elysia"

export const healthController = new Elysia().get("/health", () => ({
  status: "ok" as const
}))
