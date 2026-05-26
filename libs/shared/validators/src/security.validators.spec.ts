import { describe, expect, it } from '@jest/globals';
import {
  NroDocumentoSchema,
  PrimerNombreSchema,
  CelularSchema,
  CorreoSchema,
} from './persona.js';

describe('spec 012 — Validación de entrada contra payloads de ataque', () => {
  it("nro_documento con SQL injection payload retorna error Zod", () => {
    expect(NroDocumentoSchema.safeParse("' OR 1=1--").success).toBe(false);
  });

  it('correo con XSS payload retorna error Zod (no cumple RFC 5322)', () => {
    expect(
      CorreoSchema.safeParse('<script>alert(1)</script>@domain.com').success,
    ).toBe(false);
  });

  it('primer_nombre con tag script retorna error Zod (solo letras)', () => {
    expect(PrimerNombreSchema.safeParse('<script>alert(1)</script>').success).toBe(
      false,
    );
  });

  it('celular con más de 10 dígitos retorna error Zod', () => {
    expect(CelularSchema.safeParse('12345678901').success).toBe(false);
  });
});
