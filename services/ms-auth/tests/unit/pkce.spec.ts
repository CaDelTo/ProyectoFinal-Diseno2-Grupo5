import { describe, it, expect } from '@jest/globals';
import { generateVerifier, computeChallenge, generateState } from '../../src/auth/pkce.js';

describe('pkce', () => {
  describe('generateVerifier', () => {
    it('genera code_verifier de 43-128 chars URL-safe', () => {
      const verifier = generateVerifier();
      expect(verifier.length).toBeGreaterThanOrEqual(43);
      expect(verifier.length).toBeLessThanOrEqual(128);
      expect(verifier).toMatch(/^[A-Za-z0-9\-_]+$/);
    });

    it('genera valores distintos en cada llamada', () => {
      const v1 = generateVerifier();
      const v2 = generateVerifier();
      expect(v1).not.toBe(v2);
    });
  });

  describe('computeChallenge', () => {
    it('code_challenge = base64url(sha256(verifier))', async () => {
      // Known test vector: SHA256("abc") = ba7816bf8f01cfea414140de5dae2ec73b00361bbef0469814ad5ab0a9516920
      // base64url of that hash = unhex → base64url
      const verifier = 'abc';
      const challenge = await computeChallenge(verifier);
      expect(challenge).toBe('ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0');
    });

    it('no contiene caracteres no URL-safe (sin + ni /)', async () => {
      const verifier = generateVerifier();
      const challenge = await computeChallenge(verifier);
      expect(challenge).toMatch(/^[A-Za-z0-9\-_]+$/);
      expect(challenge).not.toContain('+');
      expect(challenge).not.toContain('/');
      expect(challenge).not.toContain('=');
    });
  });

  describe('generateState', () => {
    it('genera state hexadecimal de al menos 16 chars', () => {
      const state = generateState();
      expect(state.length).toBeGreaterThanOrEqual(16);
      expect(state).toMatch(/^[0-9a-f]+$/i);
    });

    it('genera valores distintos en cada llamada', () => {
      const s1 = generateState();
      const s2 = generateState();
      expect(s1).not.toBe(s2);
    });
  });
});
