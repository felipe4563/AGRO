#!/usr/bin/env bash
# Busca el próximo puerto interno libre para una instancia nueva en este VPS
# compartido, sin tocar nada (no crea .env, no toca Nginx). Útil para
# chequear antes de decidir, o para ver qué puertos ya están ocupados.
#
# Uso: ./deploy/puerto-libre.sh
#
# Revisa dos cosas para cada puerto candidato (arrancando en 8083):
#   1. Que no haya nada escuchando en ese puerto ahora mismo (ss).
#   2. Que ningún .env de las carpetas hermanas (otros clientes ya dados de
#      alta, aunque no estén corriendo en este momento) lo tenga reservado.

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "==> Puertos ya reservados por clientes existentes en carpetas hermanas:"
RESERVADOS="$(grep -rhs '^HOST_PORT=' ../*/.env 2>/dev/null | sort -u || true)"
if [ -z "$RESERVADOS" ]; then
  echo "    (ninguno todavía)"
else
  echo "$RESERVADOS" | sed 's/^/    /'
fi

PUERTO=8083
while ss -Htln "( sport = :$PUERTO )" 2>/dev/null | grep -q . || \
      grep -rhs "^HOST_PORT=$PUERTO$" ../*/.env 2>/dev/null | grep -q .; do
  PUERTO=$((PUERTO + 1))
done

echo "==> Próximo puerto libre: $PUERTO"
