#!/bin/bash
# Deja la base lista para grabar: restaura el respaldo (borra lo que haya
# quedado de una grabación anterior: ventas, movimientos, etc.) y aplica los
# ajustes de grabación (ajustes-demo.sql). Correr antes de CADA ensayo o
# grabación.
set -e
cd "$(dirname "$0")"

DB_NAME="bd_agropecuaria"
DB_USER="root"
DB_HOST="localhost"
DB_PORT="3306"

if [ ! -f respaldo/bd_agropecuaria.sql ]; then
  echo "[preparar] No hay respaldo (respaldo/bd_agropecuaria.sql). Corré primero: sh respaldar.sh"
  exit 1
fi

echo "[preparar] Restaurando respaldo/bd_agropecuaria.sql ..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" --default-character-set=utf8mb4 "$DB_NAME" < respaldo/bd_agropecuaria.sql

echo "[preparar] Aplicando ajustes de grabación (ajustes-demo.sql) ..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" --default-character-set=utf8mb4 "$DB_NAME" < ajustes-demo.sql

echo "[preparar] Listo. Base de datos preparada para grabar."
