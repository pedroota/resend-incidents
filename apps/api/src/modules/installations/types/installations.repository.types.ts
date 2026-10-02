import type { installations } from "@api/common/database/schema"

export type Installation = typeof installations.$inferSelect

export type UpsertInstallation = Omit<
  typeof installations.$inferInsert,
  "id" | "createdAt" | "updatedAt"
>

export type InstallationChanges = Partial<
  Omit<Installation, "id" | "teamId" | "createdAt" | "updatedAt">
>

export type InstallationTokens = Pick<
  Installation,
  "accessTokenEncrypted" | "refreshTokenEncrypted" | "accessTokenExpiresAt"
>

export type LockedTokensHandler<T> = (
  tokens: InstallationTokens | null
) => Promise<{ result: T; changes: InstallationChanges | null }>
