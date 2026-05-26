---
id: 0009
title: MinIO como almacenamiento de fotos (S3-compatible)
status: accepted
date: 2026-05-24
deciders: Equipo
---

# 0009 — MinIO como almacenamiento de fotos (S3-compatible)

## Contexto y problema

El campo `foto` puede pesar hasta 2 MB y la decisión del diseño original (`brief.md §4` y modelo de datos `§9`) fue **"se almacena ruta, no binario"** — pero el documento no define **dónde** vive el binario. Necesitamos un mecanismo de almacenamiento accesible desde el frontend y desde los microservicios, sin depender de un servicio cloud para el entorno académico.

## Drivers

- Cumplir el requisito de no guardar el binario en PostgreSQL (mantiene la BD ligera).
- Reproducibilidad local: `docker compose up` debe levantar todo el stack.
- Compatibilidad con AWS S3 / GCS para una migración futura sin reescribir código.
- Validación de tamaño (≤ 2 MB) y formato (JPG/PNG).

## Opciones consideradas

1. **Filesystem montado como volumen Docker** — Simple pero no escalable y difícil de respaldar de forma diferencial.
2. **MinIO** (S3-compatible, self-hosted, contenedor Docker oficial) — API S3 idéntica, console web, listo en un comando.
3. **AWS S3 directo** — Cuesta dinero, depende de credenciales del integrante.
4. **Almacenar en PostgreSQL como `bytea`** — Viola la decisión del brief.

## Decisión

**Elegimos la opción 2: MinIO** corriendo en su propio contenedor `storage`.

Bucket: `personas-fotos`. Estructura de claves: `fotos/<nro_documento>/<uuid>.<ext>`.

Flujo de subida:
1. Frontend obtiene un **presigned URL PUT** del microservicio (`ms-crear` o `ms-modificar`) válido por 5 minutos.
2. Frontend sube el binario directo a MinIO con el presigned URL (no pasa por los microservicios).
3. Frontend envía al microservicio la URL final junto con el resto del formulario.
4. Microservicio valida que la URL pertenece al bucket esperado, persiste en `persona.foto_url`.

Validaciones:
- Frontend valida tamaño (≤ 2 MB) y MIME (`image/jpeg`, `image/png`) **antes** de pedir el presigned URL.
- Backend re-valida tras la subida con un `HEAD` al objeto (tamaño y `Content-Type`).
- Si la persona se borra físicamente (ADR 0008), se elimina también el objeto en MinIO.

## Consecuencias

### Positivas
- API S3 estándar → migración a AWS/GCS sin reescribir lógica.
- Console web (puerto 9001) para debugging.
- Los binarios no atraviesan los microservicios (menos memoria, menos CPU).

### Negativas / Costos
- Un contenedor más en el stack.
- Necesita un volumen Docker nombrado adicional para los binarios.
- Credenciales MinIO (`MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`) deben gestionarse vía `.env`.

### Riesgos
- Bucket público accidentalmente → Mitigación: políticas de bucket privadas por defecto; acceso solo vía presigned URLs.
- Objetos huérfanos (subidos pero nunca asociados a una persona) → Mitigación: lifecycle policy de MinIO que borra objetos sin tag `committed=true` a los 7 días.

## Implicaciones para los specs

- Spec(s) afectado(s): **004-crear-persona**, **006-modificar-persona**, **007-borrar-persona**, **010-frontend**, **000-arquitectura**.
- Cambios obligados: `docker-compose.yml` incluye el servicio `storage` (`minio/minio:latest`) en el puerto interno 9000 y la consola en 9001. Variables `.env.example`: `STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`.
