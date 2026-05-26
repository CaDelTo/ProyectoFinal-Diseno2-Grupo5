import type { PrismaClient, UsuarioSistema } from '@shared/db';

export interface UpsertInput {
  identificador_sso: string;
  proveedor_sso: string;
  correo: string;
  nombre: string;
}

export async function upsertUsuario(
  prisma: PrismaClient,
  input: UpsertInput,
): Promise<UsuarioSistema> {
  return prisma.usuarioSistema.upsert({
    where: { identificador_sso: input.identificador_sso },
    create: {
      identificador_sso: input.identificador_sso,
      proveedor_sso: input.proveedor_sso,
      correo: input.correo,
      nombre: input.nombre,
    },
    update: {
      correo: input.correo,
      nombre: input.nombre,
    },
  });
}

export async function findUsuarioById(
  prisma: PrismaClient,
  idUsuario: string,
): Promise<UsuarioSistema | null> {
  return prisma.usuarioSistema.findUnique({
    where: { id_usuario: idUsuario },
  });
}

/**
 * Busca el rol de un usuario por su identificador_sso (= X-User-Id propagado por el Gateway).
 * Retorna el rol ("usuario" | "admin") o null si no existe.
 */
export async function findRolByIdentificadorSso(
  prisma: PrismaClient,
  identificadorSso: string,
): Promise<string | null> {
  const usuario = await prisma.usuarioSistema.findUnique({
    where: { identificador_sso: identificadorSso },
    select: { rol: true },
  });
  return usuario?.rol ?? null;
}

/** Lista usuarios activos ordenados por ultimo_acceso DESC. */
export async function listUsuariosActivos(
  prisma: PrismaClient,
  limit: number,
  offset: number,
): Promise<UsuarioSistema[]> {
  return prisma.usuarioSistema.findMany({
    orderBy: { ultimo_acceso: 'desc' },
    take: limit,
    skip: offset,
  });
}

/** Conteo total de usuarios del sistema. */
export async function countUsuariosActivos(prisma: PrismaClient): Promise<number> {
  return prisma.usuarioSistema.count();
}
