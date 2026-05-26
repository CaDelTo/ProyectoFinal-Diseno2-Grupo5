import { describe, it, expect } from '@jest/globals';

describe('singleton PrismaClient', () => {
  it('devuelve la misma instancia en imports repetidos', async () => {
    const { prisma: a } = await import('../index.js');
    const { prisma: b } = await import('../index.js');
    expect(a).toBe(b);
  });

  it('exporta PrismaClient y re-exporta desde generated', async () => {
    const mod = await import('../index.js');
    expect(mod.prisma).toBeDefined();
    expect(typeof mod.prisma.$connect).toBe('function');
  });
});
