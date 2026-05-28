import type { PrismaClient } from '@shared/db';

interface PersonaResumida {
  primer_nombre: string;
  segundo_nombre: string | null;
  apellidos: string;
  tipo_documento: string;
  nro_documento: string;
  fecha_nacimiento: Date | string;
  genero: string;
  correo: string;
  celular: string;
}

function buildResumen(p: PersonaResumida): string {
  const nombre = [p.primer_nombre, p.segundo_nombre, p.apellidos].filter(Boolean).join(' ');
  const fecha =
    p.fecha_nacimiento instanceof Date
      ? p.fecha_nacimiento.toISOString().split('T')[0]
      : String(p.fecha_nacimiento).split('T')[0];
  return (
    `${nombre}, documento ${p.tipo_documento} ${p.nro_documento}, ` +
    `nacido el ${fecha}, genero ${p.genero}, correo ${p.correo}, celular ${p.celular}.`
  );
}

async function fetchEmbedding(text: string, apiKey: string): Promise<number[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/gemini-embedding-001',
        content: { parts: [{ text }] },
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`Gemini API ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as { embedding: { values: number[] } };
  return json.embedding.values;
}

/**
 * Genera el embedding de la persona con Gemini y hace upsert en rag_doc_indice.
 * Diseñado para llamarse sin await (fire-and-forget): si falla no afecta
 * la respuesta principal.
 */
export async function indexPersonaRag(
  prisma: PrismaClient,
  p: PersonaResumida,
): Promise<void> {
  const apiKey = process.env['GEMINI_API_KEY'];
  if (!apiKey) return; // variable no configurada → skip silencioso

  const resumen = buildResumen(p);
  const fuente = `persona:${p.nro_documento}`;
  const values = await fetchEmbedding(resumen, apiKey);
  const vecStr = '[' + values.join(',') + ']';

  await prisma.$executeRawUnsafe(
    `INSERT INTO rag_doc_indice (id_indice, fuente, contenido_resumido, embedding, actualizado_en)
     VALUES (gen_random_uuid(), $1, $2, $3::vector, NOW())
     ON CONFLICT (fuente) DO UPDATE
       SET contenido_resumido = EXCLUDED.contenido_resumido,
           embedding          = EXCLUDED.embedding,
           actualizado_en     = NOW()`,
    fuente,
    resumen,
    vecStr,
  );
}
