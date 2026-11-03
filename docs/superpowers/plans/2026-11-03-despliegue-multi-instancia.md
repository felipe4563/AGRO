# Despliegue multi-instancia (`instancias/*.env`) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que un solo clon del repo en el VPS sirva a varios clientes agro, cada uno como un `.env` en `instancias/` y un proyecto Docker Compose propio (`-p agrov1-<nombre>`), sin romper el modelo viejo (carpeta por cliente) que siguen usando `samagro`, `inv` y `agrofertil`.

**Architecture:** `deploy.sh` detecta en qué modo está la carpeta donde corre: si existe `instancias/` con al menos un `.env`, usa el modo nuevo (multi-instancia); si no, sigue exactamente igual que hoy (modo viejo, `.env` en la raíz). Un script nuevo, `deploy/nueva-instancia.sh`, da de alta clientes en el modo nuevo. No se toca `docker-compose.yml` ni código de `backend/`/`frontend/`.

**Tech Stack:** Bash, Docker Compose, Nginx, certbot — mismo stack que `deploy.sh`/`deploy/nuevo-cliente.sh` ya usan.

**Spec:** `docs/superpowers/specs/2026-11-03-despliegue-multi-instancia-design.md`

## Global Constraints

- `instancias/*.env` nunca se sube a git (gitignorado, igual que `bd/*.sql`).
- El prefijo de proyecto Docker es `agrov1-<nombre>` (mismo nombre que las imágenes en ghcr.io).
- `deploy.sh` no debe cambiar de comportamiento para las carpetas que usan el modo viejo (`samagro`, `inv`, `agrofertil`) — es el mismo archivo compartido por `git pull` en todas.
- No se construye nada en el VPS: siempre `docker compose pull` + `up -d --no-build`.
- No se modifica `docker-compose.yml` (ya está parametrizado).

## Review Focus

- Una carpeta vieja (`samagro`) hace `git pull` y se trae el `deploy.sh` nuevo sin tener `instancias/` — debe seguir funcionando exactamente como antes (modo viejo intacto).
- `nueva-instancia.sh` corrido dos veces para el mismo nombre no debe pisar un `.env` ya generado (perdería contraseñas ya usadas en un contenedor vivo).
- Dos instancias nuevas dadas de alta una tras otra no deben terminar con el mismo `HOST_PORT` (la detección de puerto libre debe mirar los `.env` ya escritos en `instancias/`, no solo lo que está escuchando en ese instante).
- `deploy.sh` sin argumentos en modo multi-instancia, con una instancia cuyas imágenes fallan en `docker compose pull`, no debe dejar a medio actualizar las instancias que sí tenían imágenes listas — debe fallar esa instancia puntual sin tocar las demás.
- `bd/produccion.sql` ausente debe seguir cortando el deploy con el mismo mensaje claro que hoy, tanto en modo viejo como en modo nuevo.

---

## Task 1: `.gitignore` + `deploy/nueva-instancia.sh`

**Files:**
- Modify: `.gitignore`
- Create: `deploy/nueva-instancia.sh`

**Interfaces:**
- Produces: `instancias/<nombre>.env` (mismas variables que `.env.example`, con `DOMAIN`, `HOST_PORT`, `JWT_SECRET`, `DB_ROOT_PASSWORD`, `DB_PASSWORD`, `DB_NAME=bd_<nombre>`, `DB_USER=<nombre>_app` ya completados).
- Produces: vhost de Nginx en `/etc/nginx/sites-available/<dominio>.conf` + symlink en `sites-enabled/`, igual formato que `deploy/nuevo-cliente.sh` ya genera.

- [ ] **Step 1: Agregar `instancias/` a `.gitignore`**

Agregar una línea `instancias/` junto a donde ya está ignorado `bd/*.sql` (mismo criterio: datos de producción, no viaja por git).

- [ ] **Step 2: Escribir `deploy/nueva-instancia.sh`**

Uso: `./deploy/nueva-instancia.sh <nombre> <dominio>` (ej. `agrohidalgo agrohidalgo.rusoft.dev`).

Basarse en `deploy/nuevo-cliente.sh` y `deploy/puerto-libre.sh` (no modificar esos dos — siguen sirviendo al modo viejo). Lógica:

1. `cd` a la raíz del repo (`cd "$(dirname "${BASH_SOURCE[0]}")/.."`).
2. Validar que se pasaron `<nombre>` y `<dominio>`; si no, mensaje de uso y `exit 1`.
3. Si ya existe `instancias/<nombre>.env`, error: `"ya existe esta instancia — editá el .env a mano si querés cambiar algo"` y `exit 1` (replica la protección que `nuevo-cliente.sh` ya tiene contra pisar un `.env` vivo).
4. Buscar puerto libre: empezar en 8083, mientras `ss -Htln "( sport = :$PUERTO )"` tenga algo escuchando **o** `grep -rhs "^HOST_PORT=$PUERTO$" instancias/*.env` encuentre una coincidencia, incrementar.
5. `mkdir -p instancias`, `cp .env.example instancias/<nombre>.env`.
6. `sed -i` sobre ese archivo: `DOMAIN=<dominio>`, `HOST_PORT=<puerto>`, `JWT_SECRET=$(openssl rand -hex 32)`, `DB_ROOT_PASSWORD=$(openssl rand -hex 16)`, `DB_PASSWORD=$(openssl rand -hex 16)`, `DB_NAME=bd_<nombre>`, `DB_USER=<nombre>_app`.
7. Generar el vhost igual que `nuevo-cliente.sh` (mismo `deploy/nginx-vhost.conf.example`, reemplazando `__DOMINIO__`/`__PUERTO__`), activarlo y `nginx -t && systemctl reload nginx`.
8. `certbot --nginx -d <dominio>`.
9. Mensaje final con los próximos pasos: copiar `bd/produccion.sql` si es la primera instancia de este clon, y correr `./deploy.sh <nombre>`.

- [ ] **Step 3: Verificar sintaxis**

Run: `bash -n deploy/nueva-instancia.sh`
Expected: sin salida (sin errores de sintaxis).

- [ ] **Step 4: Commit**

```bash
git add .gitignore deploy/nueva-instancia.sh
git commit -m "Agrega alta de instancias nuevas bajo el modelo instancias/*.env"
```

---

## Task 2: `deploy.sh` con modo dual (viejo intacto + nuevo multi-instancia)

**Files:**
- Modify: `deploy.sh`

**Interfaces:**
- Consumes: `instancias/<nombre>.env` escrito por Task 1.
- Produces: comportamiento sin cambios para el modo viejo (ver Review Focus); en modo nuevo, `docker compose -p agrov1-<nombre> --env-file instancias/<nombre>.env` por cada instancia.

- [ ] **Step 1: Decidir el modo al arrancar `main()`**

Al principio de `main()`, antes de cualquier chequeo de `.env`: si `ls instancias/*.env` encuentra al menos un archivo, modo = multi-instancia; si no, modo = viejo (comportamiento actual sin cambios: requiere `.env` en la raíz).

- [ ] **Step 2: Extraer a una función `desplegar_instancia()` el código que hoy hace `docker compose up -d` + logs, parametrizado por `nombre_proyecto` y `env_file`**

Firma: `desplegar_instancia() { local nombre_proyecto="$1" env_file="$2"; ... }` — por dentro usa `docker compose -p "$nombre_proyecto" --env-file "$env_file" up -d --no-build --remove-orphans`, luego `ps` y `logs --tail=30 backend` con el mismo `-p`/`--env-file`. En modo viejo se llama una sola vez con `nombre_proyecto` = nombre de la carpeta actual (`$(basename "$PWD")`) y `env_file=".env"` (compose ya usa `.env` de la raíz por defecto si no se pasa `--env-file`, así que en modo viejo puede omitirse el flag — mantener el comando idéntico al actual para no cambiar nada).

- [ ] **Step 3: En modo multi-instancia, recorrer instancias**

Si se pasó un argumento (`./deploy.sh agrohidalgo`), solo esa instancia (validar que `instancias/agrohidalgo.env` existe, si no error claro). Sin argumento, recorrer todos los `instancias/*.env` encontrados, llamando `desplegar_instancia "agrov1-<nombre>" "instancias/<nombre>.env"` para cada uno — si uno falla (`docker compose pull` no encuentra imágenes, por ejemplo), registrar el error y seguir con las demás instancias, terminando con código de salida distinto de cero si alguna falló (no abortar todo el loop por una instancia).

- [ ] **Step 4: Mantener `esperar_imagenes()` y `limpiar_imagenes_viejas()` sin cambios de lógica, corridas una sola vez (las imágenes son las mismas para todas las instancias)**

- [ ] **Step 5: Verificar sintaxis y que el modo viejo no cambió**

Run: `bash -n deploy.sh`
Expected: sin errores.

Leer el diff contra la versión anterior y confirmar a ojo que, cuando no existe `instancias/`, la secuencia de comandos ejecutada es idéntica a la de antes (mismo `git pull`, mismo chequeo de `.env`/`bd/produccion.sql`, mismo `docker compose up -d --no-build --remove-orphans` sin `-p` ni `--env-file`).

- [ ] **Step 6: Commit**

```bash
git add deploy.sh
git commit -m "deploy.sh: soporta multi-instancia (instancias/*.env) sin romper el modo viejo"
```

---

## Task 3: Documentación del flujo nuevo

**Files:**
- Create: `deploy/NUEVA-INSTANCIA.md`

**Interfaces:**
- Consumes: scripts de Task 1 y Task 2 (los documenta, no los repite).

- [ ] **Step 1: Escribir `deploy/NUEVA-INSTANCIA.md`**

Mismo estilo que `deploy/NUEVO-CLIENTE.md` (pasos numerados, ejemplo concreto con `agrohidalgo.rusoft.dev`), cubriendo: prerequisito de DNS, clon único (`git clone <repo> /home/ubuntu/SISTEMAS/AGROV1`, una sola vez), `./deploy/nueva-instancia.sh agrohidalgo agrohidalgo.rusoft.dev`, copiar `bd/produccion.sql` (solo si es la primera instancia de este clon), `./deploy.sh agrohidalgo`, y cómo actualizar después (`./deploy.sh` sin argumento actualiza todas, `./deploy.sh agrohidalgo` solo esa). Agregar una nota explícita: `samagro`/`inv`/`agrofertil` siguen en el modelo viejo, migrarlos es un trabajo aparte todavía no hecho.

- [ ] **Step 2: Commit**

```bash
git add deploy/NUEVA-INSTANCIA.md
git commit -m "Documenta el alta de clientes bajo el modelo instancias/*.env"
```

---

## Task 4: Rollout real — agrohidalgo en el VPS

Este task es operativo (correr comandos reales en el VPS, no cambia código del repo más allá de lo ya commiteado). Sirve como la prueba de punta a punta del modelo nuevo.

- [ ] **Step 1: Confirmar DNS** — `agrohidalgo.rusoft.dev` con registro A a la IP del VPS, propagado.
- [ ] **Step 2: Clonar el repo una sola vez** en `/home/ubuntu/SISTEMAS/AGROV1` (si no existe ya).
- [ ] **Step 3: Copiar `bd/produccion.sql`** a esa carpeta (scp desde la máquina local, no viaja por git).
- [ ] **Step 4: Correr `./deploy/nueva-instancia.sh agrohidalgo agrohidalgo.rusoft.dev`** y confirmar que terminó sin errores (puerto asignado, vhost activo, certbot con certificado emitido).
- [ ] **Step 5: Correr `./deploy.sh agrohidalgo`** y confirmar en la salida que `docker compose -p agrov1-agrohidalgo ps` muestra los 3 contenedores (`mysql`, `backend`, `frontend`) sanos.
- [ ] **Step 6: Verificar HTTPS y login** — abrir `https://agrohidalgo.rusoft.dev`, entrar con el admin de arranque (`bd/produccion.sql`), confirmar que pide cambiar la contraseña.
- [ ] **Step 7: Confirmar aislamiento** — `docker volume ls | grep agrov1-agrohidalgo` muestra volúmenes propios, y `samagro`/`inv`/`agrofertil` (en sus carpetas viejas) no tienen contenedores tocados ni reiniciados por este trabajo.

---

## Self-Review

**1. Cobertura del spec:** clon único (Task 4), `instancias/*.env` (Task 1), aislamiento por nombre de proyecto (Task 2), `nueva-instancia.sh` (Task 1), `deploy.sh` con instancia opcional (Task 2), `produccion.sql` copiado una vez (Task 4), piloto agrohidalgo (Task 4), nota de migración pendiente de los 3 clientes viejos (Task 3). Todo cubierto.

**2/3. Steps y tipos:** nombres de función (`desplegar_instancia`, parámetros `nombre_proyecto`/`env_file`) consistentes entre Task 2 steps 2–3. Sin pasos que no decidan nada.

**4. Review Focus:** las 5 líneas de arriba tienen su verificación: modo viejo intacto → Task 2 Step 5; `nueva-instancia.sh` no pisa `.env` vivo → Task 1 Step 2.3; colisión de puertos → Task 1 Step 2.4 (mira `instancias/*.env` ya escritos); fallo parcial no debe frenar las demás instancias → Task 2 Step 3; `produccion.sql` ausente → comportamiento ya existente, no tocado, se mantiene igual en ambos modos (Task 2 no lo modifica).

**5. Proporción:** plan de 4 tasks para un spec de alcance similar a un script de deploy existente — proporcional, sin bloques de código de más.
