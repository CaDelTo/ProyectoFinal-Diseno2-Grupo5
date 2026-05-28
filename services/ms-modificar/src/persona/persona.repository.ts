import { Prisma } from '@shared/db';
import type { PrismaClient, Persona } from '@shared/db';
import { ProblemDetailsError } from '@shared/errors';
import { computeDiff, type Diff } from './diff.js';
import { buildUpdateLogDetalle } from './log-detalle.js';
import { indexPersonaRag } from './rag-indexer.js';

export interface PersonaDto {
  id_persona: string;
  nro_documento: string;
  tipo_documento: string;
  primer_nombre: string;
  segundo_nombre: string | null;
  apellidos: string;
  fecha_nacimiento: string;
  genero: string;
  correo: string;
  celular: string;
  foto_url: string | null;
  estado: string;
  creado_en: string;
  actualizado_en: string;
}

export interface UpdateResult {
  persona: PersonaDto;
  isNoop: boolean;
  prevFotoUrl: string | null;
}

export interface ModificarRepository {
  update(
    doc: string,
    data: Record<string, unknown>,
    ifMatch: string,
    userId: string,
    ip?: string,
    ua?: string,
  ): Promise<UpdateResult>;
}

function toDto(p: Persona): PersonaDto {
  return {
    ...p,
    fecha_nacimiento: p.fecha_nacimiento.toISOString(),
    creado_en: p.creado_en.toISOString(),
    actualizado_en: p.actualizado_en.toISOString(),
  };
}

export function createModificarRepository(prisma: PrismaClient): ModificarRepository {
  return {
    async update(doc, data, ifMatch, userId, ip, ua) {
      let result: UpdateResult;
      try {
        result = await prisma.$transaction(
          async (tx) => {
            const actual = await tx.persona.findUnique({ where: { nro_documento: doc } });

            if (!actual) throw new ProblemDetailsError({ type: 'not-found' });
            if (actual.estado === 'INACTIVO')
              throw new ProblemDetailsError({ type: 'conflict-inactive-person' });
            if (actual.actualizado_en.toISOString() !== ifMatch)
              throw new ProblemDetailsError({ type: 'conflict-version-mismatch' });

            const actualAsRecord = actual as unknown as Record<string, unknown>;
            const diff: Diff = computeDiff(actualAsRecord, data);

            if (Object.keys(diff).length === 0) {
              return { persona: toDto(actual), isNoop: true, prevFotoUrl: actual.foto_url };
            }

            const updated = await tx.persona.update({
              where: { nro_documento: doc },
              data: data as Prisma.PersonaUpdateInput,
            });

            await tx.logTransaccion.create({
              data: {
                tipo_transaccion: 'UPDATE',
                nro_documento: doc,
                id_usuario: userId,
                ip_origen: ip,
                dispositivo: ua,
                detalle: buildUpdateLogDetalle(
                  diff,
                  actual.actualizado_en,
                ) as unknown as Prisma.InputJsonValue,
              },
            });

            return { persona: toDto(updated), isNoop: false, prevFotoUrl: actual.foto_url };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2034'
        ) {
          throw new ProblemDetailsError({ type: 'conflict-version-mismatch' });
        }
        throw err;
      }

      // Fire-and-forget: re-indexa en RAG si hubo cambios reales
      if (!result.isNoop) {
        indexPersonaRag(prisma, result.persona).catch((err: unknown) => {
          process.stderr.write(
            JSON.stringify({ event: 'rag.index.error', nro_documento: doc, err: String(err) }) + '\n',
          );
        });
      }

      return result;
    },
  };
}
