#!/usr/bin/env bash
# Deploy automatizado en el VPS: trae los cambios de git y reconstruye con Docker.
# Uso: ./deploy.sh   (ejecutar dentro de la carpeta del proyecto en el VPS)

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

echo "==> Verificando estado del repo..."
STASHED=0
if [ -n "$(git status --porcelain)" ]; then
  echo "Hay cambios locales en el VPS (ediciones manuales). Se guardan con git stash antes del pull:"
  git status --short
  git stash push -u -m "deploy.sh $(date +%F_%T)"
  STASHED=1
fi

echo "==> git pull..."
git pull

if [ "$STASHED" -eq 1 ]; then
  echo "==> Restaurando cambios locales guardados (git stash pop)..."
  if ! git stash pop; then
    echo "ERROR: conflicto al restaurar los cambios locales del VPS."
    echo "Resuélvelo a mano: revisa 'git status', arregla los conflictos,"
    echo "'git add <archivo>' y luego vuelve a correr ./deploy.sh."
    exit 1
  fi
fi

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
