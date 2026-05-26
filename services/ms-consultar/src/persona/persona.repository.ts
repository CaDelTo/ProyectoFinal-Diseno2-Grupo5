import type { PrismaClient } from '@shared/db';

export interface PersonaDto {
  id_persona: string;
  nro_documento: string;
  tipo_documento: string;
  primer_nombre: string;
  segundo_nombre?: string | null;
  apellidos: string;
  fecha_nacimiento: string;
  genero: string;
  correo: string;
  celular: string;
  foto_url?: string | null;
  estado: string;
  creado_en: string;
  actualizado_en: string;
}

export type EstadoFilter = 'ACTIVO' | 'INACTIVO' | 'all';

export interface ConsultarRepository {
  findByDoc(doc: string): Promise<PersonaDto | null>;
  findMany(
    estadoFilter: EstadoFilter,
    take: number,
    skip: number,
  ): Promise<{ data: PersonaDto[]; total: number }>;
}

function toDto(p: {
  id_persona: string;
  nro_documento: string;
  tipo_documento: string;
  primer_nombre: string;
  segundo_nombre: string | null;
  apellidos: string;
  fecha_nacimiento: Date;
  genero: string;
  correo: string;
  celular: string;
  foto_url: string | null;
  estado: string;
  creado_en: Date;
  actualizado_en: Date;
}): PersonaDto {
  return {
    id_persona: p.id_persona,
    nro_documento: p.nro_documento,
    tipo_documento: p.tipo_documento,
    primer_nombre: p.primer_nombre,
    segundo_nombre: p.segundo_nombre,
    apellidos: p.apellidos,
    fecha_nacimiento: p.fecha_nacimiento.toISOString().slice(0, 10),
    genero: p.genero,
    correo: p.correo,
    celular: p.celular,
    foto_url: p.foto_url,
    estado: p.estado,
    creado_en: p.creado_en.toISOString(),
    actualizado_en: p.actualizado_en.toISOString(),
  };
}

export function createConsultarRepository(prisma: PrismaClient): ConsultarRepository {
  return {
    async findByDoc(doc) {
      const p = await prisma.persona.findUnique({ where: { nro_documento: doc } });
      return p ? toDto(p) : null;
    },

    async findMany(estadoFilter, take, skip) {
      const where =
        estadoFilter === 'all'
          ? {}
          : { estado: estadoFilter as 'ACTIVO' | 'INACTIVO' };

      const [rows, total] = await prisma.$transaction([
        prisma.persona.findMany({ where, take, skip, orderBy: { creado_en: 'desc' } }),
        prisma.persona.count({ where }),
      ]);

      return { data: rows.map(toDto), total };
    },
  };
}
