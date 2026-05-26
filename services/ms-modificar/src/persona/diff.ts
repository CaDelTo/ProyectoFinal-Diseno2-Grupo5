export interface DiffEntry {
  prev: unknown;
  next: unknown;
}

export type Diff = Record<string, DiffEntry>;

export function computeDiff(
  actual: Record<string, unknown>,
  dto: Record<string, unknown>,
): Diff {
  const result: Diff = {};
  for (const key of Object.keys(dto)) {
    const next = dto[key];
    if (next === undefined) continue;
    const prev = actual[key];
    if (prev !== next) {
      result[key] = { prev, next };
    }
  }
  return result;
}
