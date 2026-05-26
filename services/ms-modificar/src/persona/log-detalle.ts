import type { Diff } from './diff.js';

const NON_PII_FIELDS = new Set(['tipo_documento', 'genero']);

export interface UpdateLogDetalle {
  campos_modificados: string[];
  changes: Array<{ campo: string; prev: unknown; next: unknown }>;
  previous_updated_at: string;
}

export function buildUpdateLogDetalle(diff: Diff, previousUpdatedAt: Date): UpdateLogDetalle {
  const campos_modificados = Object.keys(diff);
  const changes = campos_modificados
    .filter((campo) => NON_PII_FIELDS.has(campo))
    .map((campo) => ({ campo, prev: diff[campo]!.prev, next: diff[campo]!.next }));

  return {
    campos_modificados,
    changes,
    previous_updated_at: previousUpdatedAt.toISOString(),
  };
}
