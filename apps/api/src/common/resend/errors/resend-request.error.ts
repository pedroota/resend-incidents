// Thrown when Resend answers a team call with a status other than 2xx.
export class ResendRequestError extends Error {
  constructor(
    readonly path: string,
    readonly status: number,
    readonly responseText: string
  ) {
    super(`Resend ${path} failed with ${status}`)
    this.name = "ResendRequestError"
  }
}
