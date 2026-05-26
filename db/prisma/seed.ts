/* eslint-disable no-console */
// Seed mínimo de desarrollo — spec 003 §4.5.
// Ejecutar con: pnpm tsx db/prisma/seed.ts

import { PrismaClient } from '../../libs/shared/db/generated/index.js';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await prisma.usuarioSistema.upsert({
    where: { identificador_sso: 'dev-user' },
    update: {},
    create: {
      proveedor_sso: 'entra',
      identificador_sso: 'dev-user',
      correo: 'dev@example.com',
      nombre: 'Dev User',
      rol: 'usuario',
    },
  });

  await prisma.persona.upsert({
    where: { nro_documento: '1001' },
    update: {},
    create: {
      nro_documento: '1001',
      tipo_documento: 'CEDULA',
      primer_nombre: 'Pedro',
      apellidos: 'Pérez',
      fecha_nacimiento: new Date('2002-03-10'),
      genero: 'MASCULINO',
      correo: 'pedro@example.com',
      celular: '3001112233',
    },
  });

  await prisma.persona.upsert({
    where: { nro_documento: '1002' },
    update: {},
    create: {
      nro_documento: '1002',
      tipo_documento: 'CEDULA',
      primer_nombre: 'Ana',
      apellidos: 'López',
      fecha_nacimiento: new Date('1985-07-22'),
      genero: 'FEMENINO',
      correo: 'ana@example.com',
      celular: '3014445566',
    },
  });

  await prisma.persona.upsert({
    where: { nro_documento: '1003' },
    update: {},
    create: {
      nro_documento: '1003',
      tipo_documento: 'TARJETA_IDENTIDAD',
      primer_nombre: 'Carlos',
      apellidos: 'Mejía',
      fecha_nacimiento: new Date('2010-12-01'),
      genero: 'NO_BINARIO',
      correo: 'carlos@example.com',
      celular: '3027778899',
      estado: 'INACTIVO',
    },
  });

  console.warn('[seed] OK: 1 usuario + 3 personas (1 inactiva)');
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
