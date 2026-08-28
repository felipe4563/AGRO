#!/usr/bin/env bash
# Deploy automatizado en el VPS: trae los cambios de git y reconstruye con Docker.
# Uso: ./deploy.sh   (ejecutar dentro de la carpeta del proyecto en el VPS)

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

echo "==> Verificando estado del repo..."
if [ -n "$(git status --porcelain)" ]; then
  echo "ERROR: hay cambios locales sin commitear en el VPS. Revísalos antes de continuar:"
  git status --short
  exit 1
fi

echo "==> git pull..."
git pull

if [ ! -f .env ]; then
  echo "ERROR: no existe .env (copia .env.example y complétalo antes del primer deploy)."
  exit 1
fi

if [ ! -f bd/produccion.sql ]; then
  echo "ERROR: falta bd/produccion.sql (no viaja por git, hay que copiarlo con scp)."
  exit 1
fi

echo "==> docker compose build..."
docker compose build

echo "==> docker compose up -d..."
docker compose up -d

echo "==> Esperando que el backend levante..."
sleep 5
docker compose ps

echo "==> Últimas líneas de logs del backend:"
docker compose logs --tail=30 backend

echo "==> Deploy completado."
