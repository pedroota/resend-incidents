import { httpClient } from "@/lib/http-client"

export async function getRegistrations() {
  const { data, error } = await httpClient.registrations.get()

  if (error) {
    throw error
  }

  return data
}

export const registrationKeys = {
  all: ["registrations"]
} as const
