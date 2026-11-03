#!/usr/bin/env bash
# Regenera bd/produccion.sql automáticamente: levanta un MySQL descartable
# en Docker, carga bd/000_base.sql (esquema fijo, incluye hasta la
# migración 011), le aplica en orden todas las migraciones bd/0NN_*.sql con
# número MAYOR al de la base, y vuelca el resultado a bd/produccion.sql.
#
# A partir de ahora, produccion.sql nunca se edita a mano: cuando agregues
# una migración nueva (ej. 012_algo.sql), corré este script y listo.
#
# Uso: ./deploy/generar-produccion.sh
# Requiere: Docker.

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

CONTENEDOR="generar-produccion-tmp"
BASE_FILE="bd/000_base.sql"

if [ ! -f "$BASE_FILE" ]; then
  echo "ERROR: falta ${BASE_FILE}."
  exit 1
fi

BASE_NUM="$(grep -oE 'Incluye hasta migración [0-9]+' "$BASE_FILE" | grep -oE '[0-9]+' || true)"
if [ -z "$BASE_NUM" ]; then
  echo "ERROR: ${BASE_FILE} no tiene el comentario 'Incluye hasta migración NNN' — no sé desde dónde aplicar."
  exit 1
fi
echo "==> Base incluye hasta migración ${BASE_NUM}."

limpiar() {
  docker rm -f "$CONTENEDOR" >/dev/null 2>&1 || true
}
trap limpiar EXIT

limpiar
echo "==> Levantando MySQL descartable..."
docker run -d --name "$CONTENEDOR" \
  -e MYSQL_ROOT_PASSWORD=temporal \
  -e MYSQL_DATABASE=bd_tmp \
  mysql:8.0 >/dev/null

echo "==> Esperando que MySQL arranque..."
# mysqladmin ping da falso positivo durante la fase de arranque temporal
# (antes de que la contraseña de root quede configurada) — hay que probar
# un login real con la contraseña final hasta que funcione.
INTENTOS=0
until docker exec "$CONTENEDOR" mysql -uroot -ptemporal -e "SELECT 1" >/dev/null 2>&1; do
  INTENTOS=$((INTENTOS + 1))
  if [ "$INTENTOS" -ge 60 ]; then
    echo "ERROR: MySQL no respondió con la contraseña final después de 60s."
    exit 1
  fi
  sleep 1
done

echo "==> Cargando ${BASE_FILE}..."
docker exec -i "$CONTENEDOR" mysql -uroot -ptemporal bd_tmp < "$BASE_FILE"

APLICADAS=0
for f in bd/0*.sql; do
  [ "$f" = "$BASE_FILE" ] && continue
  nombre="$(basename "$f")"
  num="$(echo "$nombre" | grep -oE '^[0-9]+')"
  if [ -n "$num" ] && [ "$((10#$num))" -gt "$((10#$BASE_NUM))" ]; then
    echo "==> Aplicando ${f}..."
    docker exec -i "$CONTENEDOR" mysql -uroot -ptemporal bd_tmp < "$f"
    APLICADAS=$((APLICADAS + 1))
  fi
done
echo "==> Migraciones aplicadas sobre la base: ${APLICADAS}."

echo "==> Volcando a bd/produccion.sql..."
docker exec "$CONTENEDOR" mysqldump -uroot -ptemporal --routines --triggers bd_tmp > bd/produccion.sql

echo "==> Listo: bd/produccion.sql regenerado (base hasta ${BASE_NUM} + ${APLICADAS} migración(es) nueva(s))."
