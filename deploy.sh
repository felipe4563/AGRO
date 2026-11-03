#!/usr/bin/env bash
# Deploy automatizado en el VPS: trae los cambios de git y levanta las
# imágenes ya construidas por CI (GitHub Actions + ghcr.io) — este script NO
# construye nada localmente, así que no compite por RAM/CPU con otros
# sistemas del mismo VPS compartido.
#
# Dos modos, detectados automáticamente:
#   - Modo viejo (una carpeta = un clon = un cliente, ej. samagro/inv/
#     agrofertil): si no existe instancias/, usa el .env de la raíz, igual
#     que siempre.
#   - Modo multi-instancia (ver deploy/nueva-instancia.sh): si existe
#     instancias/*.env, cada archivo es un cliente propio, con su proyecto
#     Docker Compose (-p <nombre>) — mismo nombre de proyecto que ya usan
#     las instancias existentes (ej. "samagro"), así sus volúmenes de datos
#     reales no se duplican ni quedan huérfanos al pasar a este modelo.
#
# Uso:
#   ./deploy.sh              # modo viejo: la única instancia de esta carpeta
#                             # modo multi-instancia: TODAS las de instancias/
#   ./deploy.sh <nombre>     # modo multi-instancia: solo esa instancia

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

  if [ ! -f bd/produccion.sql ]; then
    echo "ERROR: falta bd/produccion.sql (no viaja por git, hay que copiarlo con scp)."
    exit 1
  fi

  # Decide el modo y valida ANTES de esperar imágenes (hasta 15 min) — si
  # falta algo, falla al instante, igual que siempre.
  local modo_multi=0 filtro=""
  if ls instancias/*.env >/dev/null 2>&1; then
    modo_multi=1
    echo "==> Modo multi-instancia detectado (instancias/*.env)."
    filtro="${1:-}"
    if [ -n "$filtro" ] && [ ! -f "instancias/${filtro}.env" ]; then
      echo "ERROR: no existe instancias/${filtro}.env"
      exit 1
    fi
  else
    echo "==> Modo viejo (una instancia, .env en la raíz)."
    if [ ! -f .env ]; then
      echo "ERROR: no existe .env (copia .env.example y complétalo antes del primer deploy)."
      exit 1
    fi
  fi

  export TAG="$(git rev-parse HEAD)"
  echo "==> Commit actual: ${TAG}"

  esperar_imagenes

  local fallo_global=0
  if [ "$modo_multi" -eq 1 ]; then
    if [ -n "$filtro" ]; then
      desplegar_instancia "$filtro" "instancias/${filtro}.env" || fallo_global=1
    else
      for env_file in instancias/*.env; do
        local nombre
        nombre="$(basename "$env_file" .env)"
        desplegar_instancia "$nombre" "$env_file" || fallo_global=1
      done
    fi
  else
    desplegar_instancia "$(basename "$PWD")" ".env" || fallo_global=1
  fi

  limpiar_imagenes_viejas

  if [ "$fallo_global" -ne 0 ]; then
    echo "==> Deploy terminado CON ERRORES en al menos una instancia (ver arriba)."
    exit 1
  fi
  echo "==> Deploy completado (commit ${TAG})."
}

# Levanta UNA instancia con su propio proyecto Docker Compose y su propio
# .env. En modo viejo se llama una sola vez, sin -p/--env-file (mismo
# comportamiento que siempre: compose usa .env de la raíz y el nombre de
# proyecto por defecto, el de la carpeta).
desplegar_instancia() {
  local nombre="$1" env_file="$2"
  echo "----- Instancia: ${nombre} (${env_file}) -----"

  local compose_args=(up -d --no-build --remove-orphans)
  local ps_args=(ps)
  local logs_args=(logs --tail=30 backend)
  if [ "$env_file" != ".env" ]; then
    compose_args=(-p "${nombre}" --env-file "$env_file" "${compose_args[@]}")
    ps_args=(-p "${nombre}" --env-file "$env_file" "${ps_args[@]}")
    logs_args=(-p "${nombre}" --env-file "$env_file" "${logs_args[@]}")
  fi

  if ! docker compose "${compose_args[@]}"; then
    echo "ERROR: falló 'docker compose up' para la instancia ${nombre}."
    return 1
  fi

  echo "==> Esperando que el backend levante..."
  sleep 5
  docker compose "${ps_args[@]}"

  echo "==> Últimas líneas de logs del backend:"
  docker compose "${logs_args[@]}"
}

# Reintenta "docker compose pull" hasta que GitHub Actions termine de publicar
# las imágenes de este commit, o hasta agotar el tiempo de espera. Las
# imágenes son las mismas para todas las instancias, así que esto corre una
# sola vez por deploy, no por instancia.
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
