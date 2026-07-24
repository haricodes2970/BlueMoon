import pino from "pino";
import type { Environment } from "@bluemoon/types";

export interface LoggerOptions {
  environment: Environment;
  level?: pino.LevelWithSilentOrString;
  name?: string;
}

export type Logger = pino.Logger;

/**
 * Centralized logger factory, shared across every app.
 * development: pretty-printed, colorized. test/production: structured JSON.
 */
export function createLogger(options: LoggerOptions): Logger {
  const { environment, level = "info", name } = options;

  return pino({
    name,
    level,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level(label) {
        return { level: label };
      },
    },
    transport:
      environment === "development"
        ? {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "HH:MM:ss",
              ignore: "pid,hostname",
            },
          }
        : undefined,
  });
}

/** Returns a child logger scoped to a single request, for correlating log lines. */
export function withRequestId(logger: Logger, requestId: string): Logger {
  return logger.child({ requestId });
}
