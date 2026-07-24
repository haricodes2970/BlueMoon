import type { z } from "zod";

export class InvalidConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidConfigError";
  }
}

/**
 * Parses and validates environment variables against a Zod schema.
 * Fails fast: throws InvalidConfigError with every issue listed, rather
 * than letting the app start with missing/malformed configuration.
 */
export function loadEnv<T extends z.ZodTypeAny>(
  schema: T,
  source: NodeJS.ProcessEnv = process.env,
): z.infer<T> {
  const result = schema.safeParse(source);

  if (!result.success) {
    const formatted = result.error.issues
      .map(
        (issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`,
      )
      .join("\n");
    throw new InvalidConfigError(
      `Invalid environment configuration:\n${formatted}`,
    );
  }

  return result.data;
}
