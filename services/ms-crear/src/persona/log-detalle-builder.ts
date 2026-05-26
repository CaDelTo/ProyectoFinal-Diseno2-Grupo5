import type { CrearPersonaDto } from '@shared/validators';

export function buildLogDetalle(dto: CrearPersonaDto): Record<string, unknown> {
  return {
    nro_documento: dto.nro_documento,
    tipo_documento: dto.tipo_documento,
    genero: dto.genero,
  };
}
