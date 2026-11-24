#!/bin/bash
# Respalda la base local (bd_agropecuaria) antes de empezar a grabar.
# Correr UNA SOLA VEZ (o de nuevo si la base cambió mucho desde el último respaldo).
set -e
cd "$(dirname "$0")"

DB_NAME="bd_agropecuaria"
DB_USER="root"
DB_HOST="localhost"
DB_PORT="3306"

mkdir -p respaldo

echo "[respaldar] Volcando $DB_NAME a respaldo/bd_agropecuaria.sql ..."
mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" --default-character-set=utf8mb4 \
  --add-drop-table --routines --triggers \
  "$DB_NAME" > respaldo/bd_agropecuaria.sql

echo "[respaldar] Listo: $(wc -l < respaldo/bd_agropecuaria.sql) líneas."
