import { describe, expect, it } from '@jest/globals';
import {
  CrearPersonaSchema,
  ModificarPersonaSchema,
  NroDocumentoSchema,
  PrimerNombreSchema,
  SegundoNombreSchema,
  ApellidosSchema,
  CelularSchema,
  CorreoSchema,
  GeneroSchema,
  TipoDocumentoSchema,
  FechaNacimientoSchema,
} from './persona.js';

describe('Validadores compartidos de Persona (brief §4)', () => {
  describe('NroDocumentoSchema', () => {
    it.each(['1', '12345', '1234567890'])('acepta %s', (v) => {
      expect(NroDocumentoSchema.safeParse(v).success).toBe(true);
    });

    it.each([
      ['', 'vacío'],
      ['12345678901', '11 caracteres'],
      ['abc', 'letras'],
      ['12 34', 'espacio'],
      ['12.3', 'punto'],
    ])('rechaza %s (%s)', (v) => {
      expect(NroDocumentoSchema.safeParse(v).success).toBe(false);
    });
  });

  describe('PrimerNombreSchema', () => {
    it.each(['Juan', 'María José', 'Ñiño', 'Andrés'])('acepta "%s"', (v) => {
      expect(PrimerNombreSchema.safeParse(v).success).toBe(true);
    });

    it.each([
      ['Juan1', 'con número'],
      ['Juan-Pablo', 'con guion'],
      ['', 'vacío'],
      ['A'.repeat(31), '31 caracteres'],
    ])('rechaza "%s" (%s)', (v) => {
      expect(PrimerNombreSchema.safeParse(v).success).toBe(false);
    });
  });

  describe('SegundoNombreSchema (opcional)', () => {
    it('acepta undefined', () => {
      expect(SegundoNombreSchema.safeParse(undefined).success).toBe(true);
    });
    it('acepta string válido', () => {
      expect(SegundoNombreSchema.safeParse('Carlos').success).toBe(true);
    });
    it('rechaza string con números', () => {
      expect(SegundoNombreSchema.safeParse('Carlos2').success).toBe(false);
    });
  });

  describe('ApellidosSchema', () => {
    it('acepta hasta 60 caracteres', () => {
      expect(ApellidosSchema.safeParse('A'.repeat(60)).success).toBe(true);
    });
    it('rechaza 61 caracteres', () => {
      expect(ApellidosSchema.safeParse('A'.repeat(61)).success).toBe(false);
    });
    it('acepta apellidos compuestos con espacio', () => {
      expect(ApellidosSchema.safeParse('Pérez Gómez').success).toBe(true);
    });
  });

  describe('CelularSchema', () => {
    it('acepta exactamente 10 dígitos', () => {
      expect(CelularSchema.safeParse('3001234567').success).toBe(true);
    });
    it.each(['300123456', '30012345678', '3001234abc', ''])('rechaza %s', (v) => {
      expect(CelularSchema.safeParse(v).success).toBe(false);
    });
  });

  describe('CorreoSchema', () => {
    it.each(['a@b.co', 'user.name+tag@dominio.com.co'])('acepta %s', (v) => {
      expect(CorreoSchema.safeParse(v).success).toBe(true);
    });
    it.each(['no-at', 'sin@', '@sin.com', 'doble@@a.co'])('rechaza %s', (v) => {
      expect(CorreoSchema.safeParse(v).success).toBe(false);
    });
  });

  describe('Enums', () => {
    it('TipoDocumentoSchema acepta valores del catálogo', () => {
      expect(TipoDocumentoSchema.safeParse('TARJETA_IDENTIDAD').success).toBe(true);
      expect(TipoDocumentoSchema.safeParse('CEDULA').success).toBe(true);
      expect(TipoDocumentoSchema.safeParse('OTRO').success).toBe(false);
    });
    it('GeneroSchema acepta los 4 valores y rechaza otros', () => {
      for (const g of ['MASCULINO', 'FEMENINO', 'NO_BINARIO', 'PREFIERO_NO_REPORTAR']) {
        expect(GeneroSchema.safeParse(g).success).toBe(true);
      }
      expect(GeneroSchema.safeParse('OTHER').success).toBe(false);
    });
  });

  describe('FechaNacimientoSchema', () => {
    it('acepta ISO 8601 date', () => {
      expect(FechaNacimientoSchema.safeParse('1990-05-15').success).toBe(true);
    });
    it('acepta dd-mmm-yyyy en minúsculas', () => {
      expect(FechaNacimientoSchema.safeParse('15-may-1990').success).toBe(true);
    });
    it('rechaza formato libre', () => {
      expect(FechaNacimientoSchema.safeParse('15 de mayo').success).toBe(false);
    });
  });

  describe('CrearPersonaSchema', () => {
    const valido = {
      tipo_documento: 'CEDULA' as const,
      nro_documento: '12345678',
      primer_nombre: 'Juan',
      apellidos: 'Pérez',
      fecha_nacimiento: '1990-01-01',
      genero: 'MASCULINO' as const,
      correo: 'juan@example.com',
      celular: '3001234567',
    };

    it('acepta payload mínimo válido', () => {
      expect(CrearPersonaSchema.safeParse(valido).success).toBe(true);
    });

    it('segundo_nombre es opcional', () => {
      const parsed = CrearPersonaSchema.safeParse(valido);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.segundo_nombre).toBeUndefined();
      }
    });

    it('foto_object_key es opcional', () => {
      expect(CrearPersonaSchema.safeParse({ ...valido, foto_object_key: 'fotos/x/y.jpg' }).success)
        .toBe(true);
    });

    it('rechaza payload sin primer_nombre', () => {
      const { primer_nombre: _omit, ...sinNombre } = valido;
      expect(CrearPersonaSchema.safeParse(sinNombre).success).toBe(false);
    });
  });

  describe('ModificarPersonaSchema', () => {
    it('rechaza body vacío (refine)', () => {
      expect(ModificarPersonaSchema.safeParse({}).success).toBe(false);
    });

    it('acepta un solo campo', () => {
      expect(ModificarPersonaSchema.safeParse({ correo: 'nuevo@x.co' }).success).toBe(true);
    });

    it('acepta foto_object_key=null para borrar foto', () => {
      expect(ModificarPersonaSchema.safeParse({ foto_object_key: null }).success).toBe(true);
    });

    it('NO permite cambiar nro_documento', () => {
      const parsed = ModificarPersonaSchema.safeParse({ nro_documento: '999' });
      expect(parsed.success).toBe(false);
    });
  });
});
