import { describe, it, expect, jest } from '@jest/globals';
import type { PrismaClient } from '@shared/db';
import { createRepository } from '../../src/log/log.repository.js';

function makePrisma() {
  return {
    logTransaccion: {
      create: jest
        .fn()
        .mockResolvedValue({ id_log: 'new-id', tipo_transaccion: 'CREATE' }) as jest.Mock,
      findMany: jest.fn().mockResolvedValue([]) as jest.Mock,
      count: jest.fn().mockResolvedValue(0) as jest.Mock,
    },
  } as unknown as PrismaClient;
}

describe('log.repository', () => {
  it('create llama a prisma.logTransaccion.create', async () => {
    const prisma = makePrisma();
    const repo = createRepository(prisma);
    const result = await repo.create({ tipo_transaccion: 'CREATE' });
    expect(prisma.logTransaccion.create).toHaveBeenCalled();
    expect(result.id_log).toBe('new-id');
  });

  it('findMany llama con orderBy fecha_hora desc', async () => {
    const prisma = makePrisma();
    const repo = createRepository(prisma);
    await repo.findMany({ where: {}, take: 10, skip: 5 });
    expect(prisma.logTransaccion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
        skip: 5,
        orderBy: { fecha_hora: 'desc' },
      }),
    );
  });

  it('count llama a prisma.logTransaccion.count', async () => {
    const prisma = makePrisma();
    const repo = createRepository(prisma);
    const total = await repo.count({ tipo_transaccion: 'CREATE' });
    expect(prisma.logTransaccion.count).toHaveBeenCalled();
    expect(total).toBe(0);
  });
});
