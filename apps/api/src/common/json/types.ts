export type JsonValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Date
  | JsonValue[]
  | { [key: string]: JsonValue }
