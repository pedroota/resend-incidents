import type { z } from "zod"

export type ParseJsonResult<T> =
  | { success: true; data: T }
  | { success: false; error: unknown }

export function parseJson<TSchema extends z.ZodType>(
  text: string,
  schema: TSchema
): ParseJsonResult<z.output<TSchema>> {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch (error) {
    return { success: false, error }
  }

  const parsed = schema.safeParse(json)
  if (!parsed.success) {
    return { success: false, error: parsed.error }
  }

  return { success: true, data: parsed.data }
}
