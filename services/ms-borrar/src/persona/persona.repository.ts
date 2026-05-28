import { Prisma } from '@shared/db';
import type { PrismaClient } from '@shared/db';
import { ProblemDetailsError } from '@shared/errors';

export type BorrarResultado = 'DELETED' | 'DEACTIVATED';

export interface BorrarResult {
  resultado: BorrarResultado;
  fotoUrl: string | null;
}

export interface BorrarRepository {
  borrar(doc: string, userId: string, ip?: string, ua?: string): Promise<BorrarResult>;
}

export function createBorrarRepository(prisma: PrismaClient): BorrarRepository {
  return {
    async borrar(doc, userId, ip, ua) {
      try {
      return await prisma.$transaction(
        async (tx) => {
          const actual = await tx.persona.findUnique({ where: { nro_documento: doc } });

          if (!actual) throw new ProblemDetailsError({ type: 'not-found' });
          if (actual.estado === 'INACTIVO') throw new ProblemDetailsError({ type: 'not-found' });

          const nonCreateCount = await tx.logTransaccion.count({
            where: {
              nro_documento: doc,
              tipo_transaccion: { notIn: ['CREATE'] },
            },
          });

          // Eliminar del índice RAG en ambos casos (DELETE e INACTIVAR)
          await tx.ragDocIndice.deleteMany({
            where: { fuente: `persona:${doc}` },
          });

          if (nonCreateCount === 0) {
            await tx.persona.delete({ where: { nro_documento: doc } });
            await tx.logTransaccion.create({
              data: {
                tipo_transaccion: 'DELETE',
                nro_documento: null,
                id_usuario: userId,
                ip_origen: ip,
                dispositivo: ua,
                detalle: {
                  nro_documento_borrado: doc,
                  tipo_documento: actual.tipo_documento,
                } as Prisma.InputJsonValue,
              },
            });
            return { resultado: 'DELETED' as const, fotoUrl: actual.foto_url };
          }

          await tx.persona.update({
            where: { nro_documento: doc },
            data: { estado: 'INACTIVO' },
          });
          await tx.logTransaccion.create({
            data: {
              tipo_transaccion: 'DEACTIVATE',
              nro_documento: doc,
              id_usuario: userId,
              ip_origen: ip,
              dispositivo: ua,
              detalle: { previous_estado: 'ACTIVO' } as Prisma.InputJsonValue,
            },
          });
          return { resultado: 'DEACTIVATED' as const, fotoUrl: null };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          (err.code === 'P2025' || err.code === 'P2034')
        ) {
          throw new ProblemDetailsError({ type: 'not-found' });
        }
        throw err;
      }
    },
  };
}
