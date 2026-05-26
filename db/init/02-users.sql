-- Usuario de solo lectura para ms-consultar — ADR 0007.
-- READER_PASSWORD se inyecta vía variable de entorno del contenedor.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'reader') THEN
    CREATE ROLE reader WITH LOGIN PASSWORD 'reader';
  END IF;
END
$$;

GRANT CONNECT ON DATABASE datos TO reader;
GRANT USAGE ON SCHEMA public TO reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO reader;
