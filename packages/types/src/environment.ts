export const ENVIRONMENTS = ["development", "test", "production"] as const;

export type Environment = (typeof ENVIRONMENTS)[number];
