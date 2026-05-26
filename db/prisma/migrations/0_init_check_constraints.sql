-- Constraints CHECK para validaciones de dominio (brief §4).
-- Se aplican como migración manual tras `prisma migrate dev --name init`.

ALTER TABLE persona
  ADD CONSTRAINT persona_nro_documento_digits
    CHECK (nro_documento ~ '^[0-9]+$' AND length(nro_documento) <= 10),
  ADD CONSTRAINT persona_celular_digits
    CHECK (celular ~ '^[0-9]{10}$'),
  ADD CONSTRAINT persona_primer_nombre_letras
    CHECK (primer_nombre ~ '^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$'),
  ADD CONSTRAINT persona_apellidos_letras
    CHECK (apellidos ~ '^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$');

-- Índice HNSW para similitud coseno en pgvector (ADR 0002).
CREATE INDEX IF NOT EXISTS rag_doc_indice_embedding_idx
  ON rag_doc_indice
  USING hnsw (embedding vector_cosine_ops);
