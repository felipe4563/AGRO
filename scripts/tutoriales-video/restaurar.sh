#!/bin/bash
# Deja la base de desarrollo exactamente como estaba antes de grabar (sin los
# ajustes de grabación ni los datos que generaron las grabaciones). Correr al
# terminar la última sesión de grabación.
set -e
cd "$(dirname "$0")"

DB_NAME="bd_agropecuaria"
DB_USER="root"
DB_HOST="localhost"
DB_PORT="3306"

if [ ! -f respaldo/bd_agropecuaria.sql ]; then
  echo "[restaurar] No hay respaldo (respaldo/bd_agropecuaria.sql). Nada que restaurar."
  exit 1
fi

echo "[restaurar] Restaurando respaldo/bd_agropecuaria.sql ..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" --default-character-set=utf8mb4 "$DB_NAME" < respaldo/bd_agropecuaria.sql

echo "[restaurar] Listo. La base quedó como antes de grabar."
