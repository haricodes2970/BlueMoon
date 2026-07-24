import type { Environment } from "./environment.js";

export type HealthStatus = "ok" | "degraded";

export interface HealthCheckResponse {
  status: HealthStatus;
  version: string;
  environment: Environment;
}
