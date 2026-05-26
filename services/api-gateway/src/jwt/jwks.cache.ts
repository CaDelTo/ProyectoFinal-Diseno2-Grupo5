import { importJWK } from 'jose';
import type { KeyLike } from 'jose';

interface JwkObject {
  kty: string;
  kid?: string;
  [key: string]: unknown;
}

interface JwksResponse {
  keys: JwkObject[];
}

export interface JwksCacheConfig {
  jwksUri: string;
  ttlMs?: number;
  logger?: { warn: (msg: string) => void };
}

export class JwksCache {
  private readonly jwksUri: string;
  private readonly ttlMs: number;
  private readonly logger: { warn: (msg: string) => void };
  private keyCache: Map<string, KeyLike> = new Map();
  private lastFetch = 0;

  constructor(config: JwksCacheConfig) {
    this.jwksUri = config.jwksUri;
    this.ttlMs = config.ttlMs ?? 24 * 60 * 60 * 1000;
    this.logger = config.logger ?? console;
  }

  async getKey(kid: string): Promise<KeyLike | undefined> {
    if (Date.now() - this.lastFetch >= this.ttlMs) {
      await this.refresh();
    }
    return this.keyCache.get(kid);
  }

  private async refresh(): Promise<void> {
    try {
      const response = await fetch(this.jwksUri);
      if (!response.ok) {
        this.logger.warn(`JwksCache: refresh failed with status ${response.status}`);
        return;
      }
      const data = (await response.json()) as JwksResponse;
      const fresh = new Map<string, KeyLike>();
      for (const jwk of data.keys) {
        if (jwk.kid) {
          const key = await importJWK(jwk as Parameters<typeof importJWK>[0]);
          fresh.set(jwk.kid, key as KeyLike);
        }
      }
      this.keyCache = fresh;
      this.lastFetch = Date.now();
    } catch (err) {
      this.logger.warn(`JwksCache: refresh error — ${String(err)}`);
    }
  }
}
