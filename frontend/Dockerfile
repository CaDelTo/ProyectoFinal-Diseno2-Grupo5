# ── Stage 1: build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Instala dependencias del workspace raíz (necesario para @shared/*)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY libs/ libs/
COPY frontend/package.json ./frontend/package.json

RUN pnpm install --frozen-lockfile

# Copia fuentes del frontend y construye
COPY frontend/ ./frontend/

RUN pnpm --filter frontend build

# ── Stage 2: serve ───────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# Elimina config default de nginx
RUN rm /etc/nginx/conf.d/default.conf

COPY frontend/nginx.conf /etc/nginx/conf.d/frontend.conf

# Artefactos de Vite
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
