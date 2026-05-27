#!/bin/sh
# Construye la imagen base (una sola vez) y luego levanta todos los servicios.
# Uso: ./scripts/docker-build.sh
set -e

cd "$(dirname "$0")/.."

echo "▶ Construyendo imagen base (pnpm install + prisma + @shared/*)..."
DOCKER_BUILDKIT=0 docker build -t datospersonales-base:latest -f Dockerfile.base .

echo "▶ Construyendo servicios y levantando stack..."
DOCKER_BUILDKIT=0 docker compose up --build -d

echo "✔ Stack levantado. Verifica con: docker compose ps"
