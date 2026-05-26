import type { PrismaClient } from './generated/index.js';

type TransactionClient = Parameters<PrismaClient['$transaction']>[0] extends (
  tx: infer U,
) => unknown
  ? U
  : never;

export async function withTransaction<T>(
  client: PrismaClient,
  fn: (tx: TransactionClient) => Promise<T>,
): Promise<T> {
  return client.$transaction(fn, { isolationLevel: 'Serializable' });
}
