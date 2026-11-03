#!/usr/bin/env bash
# Alta de una agropecuaria nueva bajo el modelo "instancias/*.env": un solo
# clon del repo sirve a todos los clientes, cada uno es un archivo
# instancias/<nombre>.env y un proyecto Docker Compose propio (-p
# agrov1-<nombre>). No clona el repo otra vez — se corre dentro del clon
# único que ya comparten todas las instancias de este modelo.
#
# No reemplaza a deploy/nuevo-cliente.sh: ese script sigue sirviendo al
# modelo viejo (una carpeta = un clon = un cliente), que todavía usan
# samagro/inv/agrofertil y no se toca.
#
# Uso: ./deploy/nueva-instancia.sh <nombre> <dominio>
#   ej: ./deploy/nueva-instancia.sh agrohidalgo agrohidalgo.rusoft.dev
#
# Después de este script: si es la PRIMERA instancia de este clon, copiar
# bd/produccion.sql (no viaja por git) y correr ./deploy.sh <nombre>.

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

NOMBRE="${1:-}"
DOMINIO="${2:-}"
if [ -z "$NOMBRE" ] || [ -z "$DOMINIO" ]; then
  echo "Uso: $0 <nombre, ej. agrohidalgo> <dominio, ej. agrohidalgo.rusoft.dev>"
  exit 1
fi

ENV_FILE="instancias/${NOMBRE}.env"

if [ -f "$ENV_FILE" ]; then
  echo "ERROR: ya existe ${ENV_FILE} — esta instancia ya fue dada de alta."
  echo "Si querés cambiar el dominio o el puerto, editá ese archivo a mano."
  exit 1
fi

echo "==> Buscando un puerto libre para esta instancia..."
PUERTO=8083
while ss -Htln "( sport = :$PUERTO )" 2>/dev/null | grep -q . || \
      grep -rhs "^HOST_PORT=${PUERTO}$" instancias/*.env 2>/dev/null | grep -q .; do
  PUERTO=$((PUERTO + 1))
done
echo "    Puerto asignado: $PUERTO"

echo "==> Generando ${ENV_FILE} a partir de .env.example..."
mkdir -p instancias
cp .env.example "$ENV_FILE"
JWT_SECRET="$(openssl rand -hex 32)"
DB_ROOT_PASSWORD="$(openssl rand -hex 16)"
DB_PASSWORD="$(openssl rand -hex 16)"
sed -i \
  -e "s/^DOMAIN=.*/DOMAIN=${DOMINIO}/" \
  -e "s/^HOST_PORT=.*/HOST_PORT=${PUERTO}/" \
  -e "s/^JWT_SECRET=.*/JWT_SECRET=${JWT_SECRET}/" \
  -e "s/^DB_ROOT_PASSWORD=.*/DB_ROOT_PASSWORD=${DB_ROOT_PASSWORD}/" \
  -e "s/^DB_PASSWORD=.*/DB_PASSWORD=${DB_PASSWORD}/" \
  -e "s/^DB_NAME=.*/DB_NAME=bd_${NOMBRE}/" \
  -e "s/^DB_USER=.*/DB_USER=${NOMBRE}_app/" \
  "$ENV_FILE"
echo "    ${ENV_FILE} creado. Completá a mano las claves de Banco Económico / API de Personas si este cliente las usa."

echo "==> Publicando el dominio en Nginx..."
VHOST="/etc/nginx/sites-available/${DOMINIO}.conf"
sed \
  -e "s/__DOMINIO__/${DOMINIO}/g" \
  -e "s/__PUERTO__/${PUERTO}/g" \
  deploy/nginx-vhost.conf.example | sudo tee "$VHOST" > /dev/null
sudo ln -sf "$VHOST" "/etc/nginx/sites-enabled/${DOMINIO}.conf"
sudo nginx -t
sudo systemctl reload nginx

echo "==> Pidiendo certificado HTTPS con certbot..."
sudo certbot --nginx -d "$DOMINIO"

cat <<EOF

==> Alta completada: instancia "${NOMBRE}" en ${DOMINIO} (puerto interno ${PUERTO}).

Antes del primer deploy:
  1. Si este es el PRIMER cliente de este clon, copiá bd/produccion.sql
     (no viaja por git), ej.:
       scp bd/produccion.sql usuario@vps:$(pwd)/bd/produccion.sql
  2. Completá en ${ENV_FILE} las claves que falten (Banco Económico, API de Personas).
  3. Corré ./deploy.sh ${NOMBRE}
EOF
