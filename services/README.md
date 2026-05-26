# Microservicios

Cada subcarpeta es un workspace pnpm independiente. Convenciones (spec 000 §4.3):

```
services/<ms-name>/
├── Dockerfile          # multistage, basado en Dockerfile.node-template
├── package.json        # name: "@services/<name>"
├── tsconfig.json
├── jest.config.cjs
├── src/
│   ├── main.ts         # entry: levanta express + /health
│   └── <feature>.ts
├── tests/              # opcional, junto a src está bien también
└── README.md
```

Cada servicio expone `/health` (libs/shared/health) y, si aplica, sus endpoints REST detallados en su spec correspondiente.

## Estado actual

| Servicio | Spec | Estado |
|---|---|---|
| api-gateway | spec 002 | scaffolding pendiente |
| ms-auth | spec 001 | scaffolding pendiente |
| ms-crear | spec 004 | scaffolding pendiente |
| ms-modificar | spec 006 | scaffolding pendiente |
| ms-consultar | spec 005 | scaffolding pendiente |
| ms-borrar | spec 007 | scaffolding pendiente |
| ms-log | spec 008 | scaffolding pendiente |
| ms-nlp | spec 009 | workflows n8n en `workflows/` |

Próximo paso: implementar cada servicio con la skill `/new-feature`.
