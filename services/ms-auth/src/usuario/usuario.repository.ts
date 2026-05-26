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
