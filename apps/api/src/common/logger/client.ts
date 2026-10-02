import pino from "pino"
import pinoPretty from "pino-pretty"
import { env } from "@api/common/env/environment"

const isLocal = env.NODE_ENV === "local" || env.NODE_ENV === "test"

const pinoLogger = isLocal
  ? pino(
      { level: "debug", serializers: { error: pino.stdSerializers.err } },
      pinoPretty({
        colorize: true,
        translateTime: "HH:mm:ss",
        ignore: "pid,hostname"
      })
    )
  : pino({ level: "info", serializers: { error: pino.stdSerializers.err } })

interface AppLogger {
  info<TContext extends object>(message: string, meta?: TContext): void
  warn<TContext extends object>(message: string, meta?: TContext): void
  error<TContext extends object>(message: string, meta?: TContext): void
  debug<TContext extends object>(message: string, meta?: TContext): void
}

export const logger: AppLogger = {
  info(message, meta) {
    pinoLogger.info(meta ?? {}, message)
  },
  warn(message, meta) {
    pinoLogger.warn(meta ?? {}, message)
  },
  error(message, meta) {
    pinoLogger.error(meta ?? {}, message)
  },
  debug(message, meta) {
    pinoLogger.debug(meta ?? {}, message)
  }
}
