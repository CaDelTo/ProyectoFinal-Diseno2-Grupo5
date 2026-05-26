import { Prisma } from '@shared/db';
import type { PrismaClient, Persona, TipoDocumento, Genero } from '@shared/db';
import type { CrearPersonaDto } from '@shared/validators';
import { buildLogDetalle } from './log-detalle-builder.js';

export class DuplicateDocumentError extends Error {
  constructor() {
    super('conflict-duplicate-document');
    this.name = 'DuplicateDocumentError';
  }
}

const MESES: Record<string, number> = {
  ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
  jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11,
};

function parseFechaNacimiento(fecha: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return new Date(fecha + 'T00:00:00Z');
  }
  const m = fecha.match(/^(\d{2})-([a-z]{3})-(\d{4})$/);
  if (m) {
    const [, d, mes, y] = m;
    return new Date(Date.UTC(parseInt(y!), MESES[mes!]!, parseInt(d!)));
  }
  throw new Error(`fecha_nacimiento inválida: ${fecha}`);
}

export interface PersonaRepository {
  create(
    dto: CrearPersonaDto,
    userId: string,
    ip?: string,
    userAgent?: string,
  ): Promise<Persona>;
}

export function createPersonaRepository(
  prisma: PrismaClient,
  buildFotoUrl: (key: string) => string,
): PersonaRepository {
  return {
    async create(dto, userId, ip, userAgent) {
      try {
        return await prisma.$transaction(
          async (tx) => {
            const persona = await tx.persona.create({
              data: {
                tipo_documento: dto.tipo_documento as TipoDocumento,
                nro_documento: dto.nro_documento,
                primer_nombre: dto.primer_nombre,
                segundo_nombre: dto.segundo_nombre ?? null,
                apellidos: dto.apellidos,
                fecha_nacimiento: parseFechaNacimiento(dto.fecha_nacimiento),
                genero: dto.genero as Genero,
                correo: dto.correo,
                celular: dto.celular,
                foto_url: dto.foto_object_key ? buildFotoUrl(dto.foto_object_key) : null,
              },
            });

            await tx.logTransaccion.create({
              data: {
                tipo_transaccion: 'CREATE',
                nro_documento: dto.nro_documento,
                id_usuario: userId,
                ip_origen: ip,
                dispositivo: userAgent,
                detalle: buildLogDetalle(dto) as Prisma.InputJsonValue,
              },
            });

            return persona;
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          throw new DuplicateDocumentError();
        }
        throw err;
      }
    },
  };
}
