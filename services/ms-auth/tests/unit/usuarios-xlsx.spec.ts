import { describe, it, expect } from '@jest/globals';
import ExcelJS from 'exceljs';
import { buildUsuariosXlsx, USUARIOS_XLSX_HEADERS } from '../../src/usuarios/usuarios.xlsx.js';
import type { UsuarioXlsxRow } from '../../src/usuarios/usuarios.xlsx.js';

const fixture: UsuarioXlsxRow[] = [
  {
    nombre: 'Ana Torres',
    correo: 'ana@uninorte.edu.co',
    rol: 'admin',
    ultimo_acceso: new Date('2026-05-25T10:00:00Z'),
    creado_en: new Date('2026-01-01T00:00:00Z'),
  },
  {
    nombre: 'Luis Gomez',
    correo: 'luis@uninorte.edu.co',
    rol: 'usuario',
    ultimo_acceso: new Date('2026-05-24T08:00:00Z'),
    creado_en: new Date('2026-02-15T00:00:00Z'),
  },
];

describe('spec 011 — usuarios-xlsx', () => {
  it('genera workbook con 5 columnas esperadas', async () => {
    const buffer = await buildUsuariosXlsx(fixture);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.worksheets[0];

    expect(sheet).toBeDefined();

    // ExcelJS row values are 1-indexed; index 0 is undefined
    const headerRow = sheet!.getRow(1).values as (string | undefined)[];
    const headerValues = headerRow.filter(Boolean) as string[];

    expect(headerValues).toEqual(USUARIOS_XLSX_HEADERS);
  });

  it('número de filas coincide con fixture de entrada', async () => {
    const buffer = await buildUsuariosXlsx(fixture);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.worksheets[0];

    // Row 1 = headers, rows 2..N+1 = data
    expect(sheet!.rowCount).toBe(fixture.length + 1);
  });
});
