import { describe, it, expect, jest } from '@jest/globals';
import type { Response } from 'express';
import ExcelJS from 'exceljs';
import { buildXlsx, streamXlsx, XLSX_HEADERS } from '../../src/log/xlsx-streamer.js';
import type { XlsxRow } from '../../src/log/xlsx-streamer.js';

function makeRow(overrides: Partial<XlsxRow> = {}): XlsxRow {
  return {
    id_log: 'test-id',
    fecha_hora: new Date('2026-01-01T12:00:00Z'),
    tipo_transaccion: 'CREATE',
    nro_documento: null,
    id_usuario: null,
    ip_origen: null,
    detalle: null,
    ...overrides,
  };
}

describe('xlsx-streamer', () => {
  it('genera workbook con headers esperados', async () => {
    const buffer = await buildXlsx([]);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    const sheet = wb.getWorksheet('Logs')!;
    const headerValues = sheet.getRow(1).values as (string | undefined)[];

    for (const h of XLSX_HEADERS) {
      expect(headerValues).toContain(h);
    }
  });

  it('serializa detalle JSONB como string en celda', async () => {
    const row = makeRow({ detalle: { accion: 'test', valor: 42 } });
    const buffer = await buildXlsx([row]);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    const sheet = wb.getWorksheet('Logs')!;

    const headerRow = sheet.getRow(1);
    let detalleColIdx = 0;
    headerRow.eachCell((cell, colNum) => {
      if (cell.value === 'detalle') detalleColIdx = colNum;
    });

    const cellValue = sheet.getRow(2).getCell(detalleColIdx).value;
    expect(typeof cellValue).toBe('string');
    expect(cellValue as string).toContain('"accion"');
  });

  it('streamXlsx escribe Content-Type y buffer en la respuesta', async () => {
    const res = {
      setHeader: jest.fn() as jest.Mock,
      end: jest.fn() as jest.Mock,
    } as unknown as Response;

    await streamXlsx([], res, 'log-test.xlsx');

    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="log-test.xlsx"',
    );
    expect(res.end).toHaveBeenCalledWith(expect.any(Buffer));
  });
});
