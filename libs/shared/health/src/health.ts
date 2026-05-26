export type HealthCheckResult = { ok: true } | { ok: false; message: string };

export type HealthCheck = () => Promise<HealthCheckResult>;

export interface RunHealthInput {
  service: string;
  checks?: Record<string, HealthCheck>;
}

export interface HealthReport {
  service: string;
  status: 'ok' | 'degraded';
  httpStatus: 200 | 503;
  uptime: number;
  timestamp: string;
  checks: Record<string, HealthCheckResult>;
}

export async function runHealth(input: RunHealthInput): Promise<HealthReport> {
  const entries = Object.entries(input.checks ?? {});

  const results = await Promise.all(
    entries.map(async ([name, check]): Promise<[string, HealthCheckResult]> => {
      try {
        const r = await check();
        return [name, r];
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return [name, { ok: false, message }];
      }
    }),
  );

  const checks = Object.fromEntries(results);
  const allOk = results.every(([, r]) => r.ok);

  return {
    service: input.service,
    status: allOk ? 'ok' : 'degraded',
    httpStatus: allOk ? 200 : 503,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    checks,
  };
}
