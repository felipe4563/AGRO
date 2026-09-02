#!/usr/bin/env bash
# Alta de una agropecuaria nueva en este VPS compartido: reserva un puerto
# libre, genera el .env de esa instancia y publica su dominio en Nginx con
# HTTPS (certbot). Se corre UNA sola vez, dentro de la carpeta ya clonada del
# proyecto para ese cliente (una carpeta = un git clone = una instancia).
#
# Uso: ./deploy/nuevo-cliente.sh midominio.com
#
# Después de este script: copiar bd/produccion.sql al servidor (no viaja por
# git) y correr ./deploy.sh para levantar los contenedores.

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

DOMINIO="${1:-}"
if [ -z "$DOMINIO" ]; then
  echo "Uso: $0 <dominio, ej. cliente2.midominio.com>"
  exit 1
fi

if [ -f .env ]; then
  echo "ERROR: ya existe .env en esta carpeta — este script es solo para el alta inicial."
  echo "Si querés cambiar el dominio o el puerto de un cliente existente, editá .env a mano."
  exit 1
fi

echo "==> Buscando un puerto libre para esta instancia..."
PUERTO="$(deploy/puerto-libre.sh | tail -1 | grep -o '[0-9]\+')"
echo "    Puerto asignado: $PUERTO"

echo "==> Generando .env a partir de .env.example..."
cp .env.example .env
JWT_SECRET="$(openssl rand -hex 32)"
DB_ROOT_PASSWORD="$(openssl rand -hex 16)"
DB_PASSWORD="$(openssl rand -hex 16)"
sed -i \
  -e "s/^DOMAIN=.*/DOMAIN=${DOMINIO}/" \
  -e "s/^HOST_PORT=.*/HOST_PORT=${PUERTO}/" \
  -e "s/^JWT_SECRET=.*/JWT_SECRET=${JWT_SECRET}/" \
  -e "s/^DB_ROOT_PASSWORD=.*/DB_ROOT_PASSWORD=${DB_ROOT_PASSWORD}/" \
  -e "s/^DB_PASSWORD=.*/DB_PASSWORD=${DB_PASSWORD}/" \
  .env
echo "    .env creado. Completá a mano las claves de Banco Económico / API de Personas si este cliente las usa."

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

==> Alta completada para ${DOMINIO} (puerto interno ${PUERTO}).

Antes del primer deploy:
  1. Copiá bd/produccion.sql a esta carpeta (no viaja por git), ej.:
       scp bd/produccion.sql usuario@vps:$(pwd)/bd/produccion.sql
  2. Completá en .env las claves que falten (Banco Económico, API de Personas).
  3. Corré ./deploy.sh
EOF
