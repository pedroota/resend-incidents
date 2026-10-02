import { timingSafeEqual } from "node:crypto"

export function statesMatch(expectedState: string, receivedState: string) {
  const expectedBytes = Buffer.from(expectedState)
  const receivedBytes = Buffer.from(receivedState)
  return (
    expectedBytes.length === receivedBytes.length &&
    timingSafeEqual(expectedBytes, receivedBytes)
  )
}
