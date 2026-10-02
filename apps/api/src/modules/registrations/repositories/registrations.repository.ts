import { count } from "drizzle-orm"
import { database } from "@api/common/database"
import { users } from "@api/common/database/schema"

async function countRegisteredUsers() {
  const [registered] = await database.select({ total: count() }).from(users)

  return registered?.total ?? 0
}

export const registrationsRepository = { countRegisteredUsers }
