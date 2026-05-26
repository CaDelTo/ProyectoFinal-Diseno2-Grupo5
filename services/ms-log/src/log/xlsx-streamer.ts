import ExcelJS from 'exceljs';
import type { Response } from 'express';

export interface XlsxRow {
  id_log: string;
  fecha_hora: Date;
  tipo_transaccion: string;
  nro_documento: string | null;
  id_usuario: string | null;
  ip_origen: string | null;
  detalle: unknown;
}

export const XLSX_HEADERS = [
  'id_log',
  'fecha_hora',
  'tipo_transaccion',
  'nro_documento',
  'id_usuario',
  'ip_origen',
  'detalle',
];

export async function buildXlsx(rows: XlsxRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Logs');

  sheet.columns = XLSX_HEADERS.map((header) => ({ header, key: header, width: 24 }));

  for (const row of rows) {
    sheet.addRow({
      id_log: row.id_log,
      fecha_hora: row.fecha_hora.toISOString(),
      tipo_transaccion: row.tipo_transaccion,
      nro_documento: row.nro_documento ?? '',
      id_usuario: row.id_usuario ?? '',
      ip_origen: row.ip_origen ?? '',
      detalle: row.detalle != null ? JSON.stringify(row.detalle) : '',
    });
  }

  return workbook.xlsx.writeBuffer() as unknown as Promise<Buffer>;
}

export async function streamXlsx(
  rows: XlsxRow[],
  res: Response,
  filename: string,
): Promise<void> {
  const buffer = await buildXlsx(rows);
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.end(buffer);
}
