import type { PrismaClient, LogTransaccion, Prisma } from '@shared/db';
import type { LogEntryDto } from './log-entry.dto.js';
import type { WhereClause } from './query-filters.js';

export interface FindManyOptions {
  where: WhereClause;
  take: number;
  skip: number;
}

export interface Repository {
  create(dto: LogEntryDto): Promise<LogTransaccion>;
  findMany(opts: FindManyOptions): Promise<LogTransaccion[]>;
  count(where: WhereClause): Promise<number>;
}

export function createRepository(prisma: PrismaClient): Repository {
  return {
    create(dto) {
      return prisma.logTransaccion.create({ data: dto });
    },
    findMany({ where, take, skip }) {
      return prisma.logTransaccion.findMany({
        where: where as Prisma.LogTransaccionWhereInput,
        take,
        skip,
        orderBy: { fecha_hora: 'desc' },
      });
    },
    count(where) {
      return prisma.logTransaccion.count({ where: where as Prisma.LogTransaccionWhereInput });
    },
  };
}
