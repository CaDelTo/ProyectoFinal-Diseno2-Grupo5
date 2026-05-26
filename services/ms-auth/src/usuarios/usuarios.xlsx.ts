import ExcelJS from 'exceljs';

export const USUARIOS_XLSX_HEADERS = [
  'Nombre',
  'Correo',
  'Rol',
  'Último acceso',
  'Registrado desde',
];

export interface UsuarioXlsxRow {
  nombre: string;
  correo: string;
  rol: string;
  ultimo_acceso: Date | string;
  creado_en: Date | string;
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

export async function buildUsuariosXlsx(rows: UsuarioXlsxRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Usuarios activos');

  sheet.columns = [
    { header: 'Nombre',           key: 'nombre',        width: 30 },
    { header: 'Correo',           key: 'correo',        width: 35 },
    { header: 'Rol',              key: 'rol',           width: 12 },
    { header: 'Último acceso',    key: 'ultimo_acceso', width: 28 },
    { header: 'Registrado desde', key: 'creado_en',     width: 28 },
  ];

  for (const row of rows) {
    sheet.addRow({
      nombre:        row.nombre,
      correo:        row.correo,
      rol:           row.rol,
      ultimo_acceso: toIso(row.ultimo_acceso),
      creado_en:     toIso(row.creado_en),
    });
  }

  return workbook.xlsx.writeBuffer() as unknown as Promise<Buffer>;
}
