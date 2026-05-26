import { randomBytes, createHash } from 'node:crypto';

export function generateVerifier(): string {
  return randomBytes(32).toString('base64url');
}

export async function computeChallenge(verifier: string): Promise<string> {
  const hash = createHash('sha256').update(verifier).digest();
  return Buffer.from(hash).toString('base64url');
}

export function generateState(): string {
  return randomBytes(16).toString('hex');
}
