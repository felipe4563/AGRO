#!/usr/bin/env bash
# Deploy automatizado en el VPS: trae los cambios de git y levanta las
# imágenes ya construidas por CI (GitHub Actions + ghcr.io) — este script NO
# construye nada localmente, así que no compite por RAM/CPU con otros
# sistemas del mismo VPS compartido.
# Uso: ./deploy.sh   (ejecutar dentro de la carpeta del proyecto en el VPS)

set -euo pipefail

ESPERA_MAX_SEGUNDOS=900
ESPERA_INTERVALO_SEGUNDOS=30

main() {
  cd "$(dirname "${BASH_SOURCE[0]}")"

  echo "==> Verificando que no haya cambios locales sin commitear..."
  if [ -n "$(git status --porcelain)" ]; then
    echo "ERROR: hay cambios locales sin commitear en esta carpeta del VPS."
    echo "Resuélvelo a mano (git status) antes de desplegar — este script ya"
    echo "no hace stash automático, porque ahora corre git pull --ff-only."
    exit 1
  fi

  echo "==> git pull --ff-only..."
  git pull --ff-only

  if [ ! -f .env ]; then
    echo "ERROR: no existe .env (copia .env.example y complétalo antes del primer deploy)."
    exit 1
  fi

  if [ ! -f bd/produccion.sql ]; then
    echo "ERROR: falta bd/produccion.sql (no viaja por git, hay que copiarlo con scp)."
    exit 1
  fi

  export TAG="$(git rev-parse HEAD)"
  echo "==> Commit actual: ${TAG}"

  esperar_imagenes

  echo "==> docker compose up -d --no-build --remove-orphans..."
  docker compose up -d --no-build --remove-orphans

  echo "==> Esperando que el backend levante..."
  sleep 5
  docker compose ps

  echo "==> Últimas líneas de logs del backend:"
  docker compose logs --tail=30 backend

  limpiar_imagenes_viejas

  echo "==> Deploy completado (commit ${TAG})."
}

# Reintenta "docker compose pull" hasta que GitHub Actions termine de publicar
# las imágenes de este commit, o hasta agotar el tiempo de espera. Si el
# push a GitHub acaba de pasar, el workflow puede tardar unos minutos.
esperar_imagenes() {
  local transcurrido=0
  while true; do
    echo "==> docker compose pull (commit ${TAG})..."
    if docker compose pull backend frontend; then
      echo "    Imágenes del commit ${TAG} disponibles."
      return 0
    fi

    if [ "$transcurrido" -ge "$ESPERA_MAX_SEGUNDOS" ]; then
      echo "ERROR: GitHub Actions no publicó las imágenes del commit ${TAG}"
      echo "       después de $((ESPERA_MAX_SEGUNDOS / 60)) minutos."
      echo "       Producción sigue corriendo con la versión anterior — nada se tocó."
      echo "       Revisa el workflow en GitHub → Actions antes de reintentar."
      exit 1
    fi

    echo "    Todavía no están — reintentando en ${ESPERA_INTERVALO_SEGUNDOS}s..."
    sleep "$ESPERA_INTERVALO_SEGUNDOS"
    transcurrido=$((transcurrido + ESPERA_INTERVALO_SEGUNDOS))
  done
}

# Borra solo las imágenes colgantes (<none>, las que deja atrás un pull de una
# versión nueva con el mismo tag) que sean de ESTE proyecto — identificadas
# por la etiqueta org.opencontainers.image.source que pone el workflow, que a
# diferencia del nombre repo:tag sobrevive aunque la imagen quede dangling.
# Así no se toca ninguna imagen de otro sistema que comparta el VPS.
limpiar_imagenes_viejas() {
  echo "==> Limpiando imágenes viejas de este proyecto..."
  local repo_url
  repo_url="$(git remote get-url origin 2>/dev/null | sed -E 's#\.git$##')"

  docker images --filter "dangling=true" --format '{{.ID}}' \
    | while read -r id; do
        origen="$(docker inspect "$id" --format '{{ index .Config.Labels "org.opencontainers.image.source" }}' 2>/dev/null || true)"
        if [ -n "$origen" ] && [ "$origen" = "$repo_url" ]; then
          docker rmi "$id" 2>/dev/null || true
        fi
      done
}

main "$@"
