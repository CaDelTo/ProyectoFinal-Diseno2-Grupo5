-- Extensión pgvector — ADR 0002.
-- Se ejecuta automáticamente al primer arranque del contenedor `db`
-- gracias al volumen montado en /docker-entrypoint-initdb.d.
CREATE EXTENSION IF NOT EXISTS vector;
