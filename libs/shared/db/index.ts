import { PrismaClient } from './generated/index.js';

export * from './generated/index.js';

let _instance: PrismaClient | undefined;

export function getPrisma(): PrismaClient {
  if (!_instance) {
    _instance = new PrismaClient();
  }
  return _instance;
}

export const prisma: PrismaClient = getPrisma();
