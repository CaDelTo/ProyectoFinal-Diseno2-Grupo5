import { describe, it, expect, beforeEach } from '@jest/globals';
import { createStateCache } from '../../src/auth/state.cache.js';

describe('state.cache', () => {
  let cache: ReturnType<typeof createStateCache>;

  beforeEach(() => {
    cache = createStateCache();
  });

  it('almacena verifier y expira a los 10 minutos', () => {
    cache.set('state-abc', 'verifier-xyz');
    const result = cache.get('state-abc');
    expect(result).toBe('verifier-xyz');
  });

  it('devuelve null para state desconocido', () => {
    expect(cache.get('nonexistent')).toBeNull();
  });

  it('devuelve null tras expiración del TTL', () => {
    const shortCache = createStateCache(50); // 50ms TTL
    shortCache.set('state-exp', 'verifier-exp');
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(shortCache.get('state-exp')).toBeNull();
        resolve();
      }, 100);
    });
  });

  it('del elimina la entrada', () => {
    cache.set('state-del', 'verifier-del');
    cache.del('state-del');
    expect(cache.get('state-del')).toBeNull();
  });

  it('sobrescribe si se hace set con el mismo state', () => {
    cache.set('state-dup', 'verifier-1');
    cache.set('state-dup', 'verifier-2');
    expect(cache.get('state-dup')).toBe('verifier-2');
  });
});
