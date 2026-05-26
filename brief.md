# Brief — Sistema de Gestión de Datos Personales

> Universidad del Norte · Ingeniería de Sistemas y Computación · Diseño de Software II · 2026
> Trabajo Final en Grupo · Integrantes: Camilo Del Toro, Juan Delgado, César Vizcaíno, Jeison Acosta
> Docente: Pierre Andrés Julliard Amador

## 1. Propósito

Construir una aplicación web modular para **gestionar datos personales** de la comunidad de la institución, con CRUD completo, auditoría integral, autenticación SSO y consultas en lenguaje natural (RAG) a través de n8n. Todo el sistema debe desplegarse en contenedores Docker independientes por microservicio.

## 2. Alcance funcional (menú principal)

| # | Funcionalidad | Microservicio | Contenedor independiente |
|---|---|---|---|
| 1 | Crear Personas | `ms-crear` | No |
| 2 | Modificar Datos Personales | `ms-modificar` | No |
| 3 | Consultar Datos Personales | `ms-consultar` | **Sí — habilitable/deshabilitable bajo demanda** |
| 4 | Consultar Datos Personales – Lenguaje Natural (n8n) | `ms-nlp` (n8n) | **Sí — desacoplado** |
| 5 | Borrar Personas | `ms-borrar` | No |
| 6 | Consultar log | `ms-log` | No |
| — | Base de datos | `db` (PostgreSQL + pgvector) | **Sí — solo red interna** |

## 3. Campos del formulario

`Tipo de documento`, `Nro. Documento`, `Primer Nombre`, `Segundo Nombre`, `Apellidos`, `Fecha de Nacimiento`, `Género`, `Correo electrónico`, `Celular`, `Foto`.

## 4. Validaciones de dominio

| Campo | Tipo | Restricción |
|---|---|---|
| Tipo de documento | Lista | `Tarjeta de identidad` \| `Cédula`. Obligatorio. |
| Nro. Documento | Numérico | Solo dígitos, máx. 10 caracteres. Único. Obligatorio. |
| Primer Nombre | Texto | Solo letras. Máx. 30. Obligatorio. |
| Segundo Nombre | Texto | Solo letras. Máx. 30. Opcional. |
| Apellidos | Texto | Solo letras. Máx. 60. Obligatorio. |
| Fecha de Nacimiento | DATE | Calendario o escritura `dd-mmm-yyyy`. Obligatorio. |
| Género | Lista | `Masculino` \| `Femenino` \| `No binario` \| `Prefiero no reportar`. |
| Correo electrónico | Email | RFC 5322 válido. Obligatorio. |
| Celular | Numérico | Solo dígitos, exactamente 10 caracteres. Obligatorio. |
| Foto | Archivo | JPG / PNG. Máx. 2 MB. Se almacena ruta, no binario. Opcional. |

## 5. Requerimientos funcionales y no funcionales

| ID | Requerimiento | Criterio de aceptación |
|---|---|---|
| RF-01 | CRUD completo de personas | Crear, consultar, modificar y borrar usando `nro_documento` como llave. |
| RF-02 | Log obligatorio por transacción | Toda operación escribe en `log_transaccion` antes de retornar respuesta. |
| RF-03 | Consultar log con filtros combinables | Filtros por tipo, documento y rango de fechas. Exportable a Excel. |
| RF-04 | Autenticación SSO | API Gateway valida JWT en cada solicitud; rechaza con 401 si inválido. |
| RF-05 | Microservicio de consulta controlable | `ms-consultar` puede detenerse/reiniciarse sin afectar otros servicios. |
| RF-06 | Consulta RAG en n8n | Pregunta en lenguaje natural retorna respuesta coherente basada en datos reales. |
| RF-07 | Borrado controlado por historial | Sin historial: eliminación física. Con historial: solo inactivación. |
| RNF-01 | Portabilidad total | `docker compose up --build` levanta el entorno completo desde cero. |
| RNF-02 | Seguridad de secretos | Ningún secreto en código fuente; todo vía variables de entorno. |
| RNF-03 | Resiliencia parcial | Caída de un servicio no derrumba el sistema completo. |

## 6. Casos de uso

| CU | Caso de uso | Flujo principal | Flujo alternativo |
|---|---|---|---|
| CU-01 | Crear Persona | Diligencia formulario → valida → persiste → log `CREATE`. | Duplicado → HTTP 409. Inválido → HTTP 400. |
| CU-02 | Modificar Datos | Busca por documento → edita → valida → actualiza → log `UPDATE` con diferencial. | Inexistente → HTTP 404. |
| CU-03 | Consultar Datos | Ingresa documento → recupera → log `QUERY`. | Contenedor detenido → HTTP 503. No encontrado → HTTP 404. |
| CU-04 | Borrar Persona | Verifica historial → elimina o inactiva → log `DELETE`/`DEACTIVATE`. | Usuario cancela → ninguna operación. |
| CU-05 | Consultar Log | Aplica filtros (tipo, doc., fecha) → lista resultados → opcional exportar a Excel. | Sin coincidencias → listado vacío. |
| CU-06 | Consulta RAG | Pregunta en chat n8n → recupera datos → LLM responde → log `QUERY_NL`. | Sin datos → LLM indica falta de información. |

## 7. Arquitectura

Frontend → API Gateway (valida JWT, enruta, rate limiting) → Microservicios (cada uno con su BD vía Prisma) → PostgreSQL (red interna).
El flujo RAG vive en n8n, consume PostgreSQL/`pgvector` y escribe en el log.

| Contenedor | Puerto | Responsabilidad |
|---|---|---|
| `frontend` | 3000 | Interfaz React. Menú principal y formularios. |
| `api-gateway` | 80 | Valida JWT, enruta por path, rate limiting. |
| `ms-auth` | 4000 | Flujo OAuth2/OIDC con el proveedor SSO. |
| `ms-crear` | 4001 | Valida y persiste nuevo registro; log `CREATE`. |
| `ms-modificar` | 4002 | Actualiza registro existente; log `UPDATE`. |
| `ms-consultar` † | 4003 | Solo lectura por documento. Controlable. |
| `ms-borrar` | 4004 | Elimina o inactiva; log `DELETE`/`DEACTIVATE`. |
| `ms-log` | 4005 | Expone log con filtros y exportación a Excel. |
| `ms-nlp` (n8n) | 5678 | Pipeline RAG: recupera contexto, llama LLM, responde en chat. |
| `db` (PostgreSQL) ‡ | 5432 | Persistencia con `pgvector`. Volumen externo. |

† Puede detenerse/reiniciarse sin afectar a los demás. ‡ No expuesto al exterior.

## 8. Stack tecnológico

| Capa | Tecnología | Justificación |
|---|---|---|
| Frontend | React + TypeScript | Componentes reutilizables, tipado fuerte, integración SSO. |
| Microservicios | Node.js + Express | I/O no bloqueante, fácil contenedorización. |
| Base de datos | PostgreSQL 15 + `pgvector` | Integridad relacional + vectores semánticos en un solo motor. |
| ORM | Prisma | Migraciones declarativas; protección contra inyección SQL. |
| Infraestructura | Docker + Docker Compose | Reproducibilidad total con un solo archivo. |
| Gateway | Nginx + JWT middleware | Validación de tokens y enrutamiento por path. |
| Autenticación | Microsoft Entra / Proyecto Roble | SSO corporativo; sin gestión propia de contraseñas. |
| IA / NLP | n8n + OpenAI API / Ollama | Flujos RAG visuales con chat integrado. |

## 9. Modelo de datos (resumen)

- **persona** — `id_persona` (PK), `nro_documento` (UK), `tipo_documento`, `primer_nombre`, `segundo_nombre`, `apellidos`, `fecha_nacimiento`, `genero`, `correo`, `celular`, `foto_url`, `estado`, `creado_en`, `actualizado_en`.
- **log_transaccion** — `id_log` (PK), `tipo_transaccion` (`CREATE`/`UPDATE`/`DELETE`/`DEACTIVATE`/`QUERY`/`QUERY_NL`), `nro_documento` (FK), `id_usuario` (FK), `fecha_hora`, `ip_origen`, `dispositivo`, `detalle` (JSONB), `pregunta_rag`, `respuesta_rag`.
- **usuario_sistema** — `id_usuario` (PK), `proveedor_sso`, `identificador_sso`, `correo`, `nombre`, `rol`, `ultimo_acceso`.
- **rag_doc_indice** — `id_indice` (PK), `fuente`, `contenido_resumido`, `embedding` (vector), `actualizado_en`.

**Restricciones críticas:** `UNIQUE` sobre `persona.nro_documento`; `CHECK (campo ~ '^[0-9]+$')` para documento/celular; FK `ON DELETE RESTRICT` desde `log_transaccion`; log escrito **dentro de la misma transacción** de negocio.

## 10. Seguridad (resumen)

JWT validado en Gateway · Prisma con consultas parametrizadas · React escapa por defecto + CSP en Nginx · Bearer token (sin cookies de sesión) · Rate limiting · Secrets solo en `.env` (en `.gitignore`) · DB solo en red interna · Usuario de DB de `ms-consultar` con permisos `SELECT` únicamente · Imágenes Docker sin root.

## 11. Distribución de puntos (referencia para alcance)

| Actividad | Puntos |
|---|---:|
| SSO (Entra / Roble / equivalente) | 4 |
| CRUD + log de transacciones en contenedores | 15 |
| Consulta lenguaje natural con n8n + RAG | 12 |
| Captura de campos del formulario | 2 |
| Validaciones requeridas | 4 |
| Un microservicio por opción del menú | 5 |
| `ms-consultar` en contenedor habilitable/deshabilitable | 3 |
| BD en contenedor independiente | 2 |
| Consulta de log con filtros (tipo/documento/fecha) | 3 |

## 12. Definición de "Hecho" (Definition of Done)

Una funcionalidad está hecha cuando:

1. Existe una **spec** en `specs/<feature>/spec.md` con criterios de aceptación.
2. Existen **pruebas** (unitarias + de integración) que cubren los criterios y **fallan antes** de la implementación (TDD).
3. La implementación pasa todas las pruebas.
4. Se ejecutó `docker compose up --build` y la funcionalidad se probó end-to-end.
5. Cada operación queda registrada en `log_transaccion`.
6. No hay secretos en el código; todas las credenciales vienen de variables de entorno.
7. El código pasa lint/format y revisión por pares.

## 13. Riesgos principales

| Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|
| Incompatibilidad con proveedor SSO | Media | Alto | Prototipo aislado del flujo OAuth2 antes de integrar al Gateway. |
| Respuestas RAG imprecisas | Alta | Medio | Definir y probar prompt con preguntas representativas desde el inicio. |
| Pérdida de datos al recrear DB | Baja | Alto | Named volume para PostgreSQL desde el primer commit. |
| Secrets expuestos | Baja | Alto | `.env` en `.gitignore`; revisar con `git-secrets` antes de cada push. |
| Desconocimiento del stack | Media | Medio | Sprint de ambientación + pair programming. |
