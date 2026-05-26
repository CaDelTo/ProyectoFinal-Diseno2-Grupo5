const DEFAULT_TTL_MS = 10 * 60 * 1000;

interface Entry {
  verifier: string;
  expiresAt: number;
}

export function createStateCache(ttlMs: number = DEFAULT_TTL_MS) {
  const map = new Map<string, Entry>();

  return {
    set(state: string, verifier: string): void {
      map.set(state, { verifier, expiresAt: Date.now() + ttlMs });
    },
    get(state: string): string | null {
      const entry = map.get(state);
      if (!entry) return null;
      if (Date.now() > entry.expiresAt) {
        map.delete(state);
        return null;
      }
      return entry.verifier;
    },
    del(state: string): void {
      map.delete(state);
    },
  };
}

export type StateCache = ReturnType<typeof createStateCache>;
