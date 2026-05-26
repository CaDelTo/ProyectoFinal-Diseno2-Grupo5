---
id: 0004
title: Microsoft Entra ID como proveedor SSO
status: accepted
date: 2026-05-24
deciders: Equipo
---

# 0004 — Microsoft Entra ID como proveedor SSO

## Contexto y problema

El requisito (`brief.md §11`, 4 pts) exige autenticación mediante "Microsoft Entra, el Proyecto Roble o cualquier otro SSO reconocido". El documento de diseño deja la opción abierta y no toma decisión. Hay que elegir un proveedor concreto antes de implementar `ms-auth`.

## Drivers

- Cobertura de tutoriales y soporte de la comunidad.
- Disponibilidad gratuita para entornos de desarrollo.
- Cumplimiento OAuth2 + OIDC estándar (compatibilidad con `passport-azure-ad`, `oidc-client-ts`, etc.).
- Reducir riesgo de bloqueo por dependencia institucional específica.

## Opciones consideradas

1. **Microsoft Entra ID** — Free tier suficiente para dev/test. Documentación extensa. OAuth2/OIDC estándar. Compatible con cualquier librería OIDC.
2. **Proyecto Roble (UNINORTE)** — Acceso restringido al ambiente institucional; bloquea desarrollo desde fuera del campus o cuentas externas.
3. **Auth0** — Excelente DX pero free tier limitado y requiere registrar la app en un tenant externo adicional.
4. **Keycloak self-hosted** — Control total pero añade un contenedor más a mantener.

## Decisión

**Elegimos la opción 1: Microsoft Entra ID** (tenant personal o académico del integrante con cuenta Microsoft 365).

Configuración:

- Tipo: SPA + Web API (Authorization Code + PKCE).
- Audience: el `client_id` registrado en Entra.
- Scopes: `openid`, `profile`, `email`.
- Access token TTL: 15 minutos (configurado en Entra).
- Refresh token TTL: 8 horas (rotación habilitada).
- Claims requeridos en JWT: `sub` (= `identificador_sso`), `email`, `name`, `preferred_username`.

## Consecuencias

### Positivas
- Cualquier integrante puede levantar el entorno sin VPN o credenciales institucionales.
- Librerías maduras para frontend (`@azure/msal-react`) y backend (`passport-azure-ad`).
- Tokens estándar JWT validables con JWKS público.

### Negativas / Costos
- Depende de disponibilidad del tenant personal del integrante que registró la app → mitigado documentando el procedimiento de re-registro.

### Riesgos
- Cambios en el flujo OAuth2 de Microsoft → Mitigación: prototipar el flujo de forma aislada antes de integrar al Gateway (riesgo identificado en `brief.md §13`).
- Tokens vencidos en sesiones largas → Mitigación: refresh token + retry transparente en el cliente.

## Implicaciones para los specs

- Spec(s) afectado(s): **001-autenticacion-sso**, **002-api-gateway**, **010-frontend**.
- Cambios obligados: variables de entorno `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` documentadas en `.env.example`. La validación JWT en el Gateway descarga JWKS desde `https://login.microsoftonline.com/{tenant}/discovery/v2.0/keys` con caché de 24h.
