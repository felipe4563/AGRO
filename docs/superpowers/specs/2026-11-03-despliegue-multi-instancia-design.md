# Despliegue "una instalación, múltiples instancias" (modelo `instancias/*.env`)

## Intención y por qué

Hoy cada cliente agropecuario (`samagro`, `inv`, `agrofertil`) vive en su
propia carpeta del VPS, cada una con su propio `git clone` completo del
repo. Eso significa repetir el mismo código una vez por cliente, y que
cada alta nueva (`deploy/nuevo-cliente.sh`) clona el proyecto entero de
nuevo. El VPS es compartido con ~15 proyectos ajenos y la RAM es el
recurso más ajustado (ver mantenimiento de VPS de 2026-10), así que
repetir clones completos por cada cliente agro que se sume no escala.

Un proyecto hermano (MENU, sistema de restaurantes) ya resolvió esto con
un modelo de "un solo clon, muchas instancias": el código y las imágenes
Docker son una sola cosa en ghcr.io; cada cliente es solo un archivo
`.env` en `instancias/` y un proyecto de Docker Compose nombrado
(`-p menu-<nombre>`), cada uno con sus propios volúmenes de datos.
Este documento adapta ese mismo modelo a SIS-AGROV1 (SAMAGRO).

El cliente piloto de este modelo nuevo es **agrohidalgo**
(`agrohidalgo.rusoft.dev`) — nace directamente bajo el modelo nuevo, sin
tener datos previos que migrar.

## Goals

- Un solo clon del repo en el VPS sirve a todos los clientes agro nuevos.
- Dar de alta un cliente nuevo no requiere clonar el repo otra vez.
- Cada cliente sigue totalmente aislado: su propia base MySQL, sus
  propios uploads/backups, su propio dominio — solo comparten el código
  y las imágenes Docker.
- Actualizar el código (`deploy.sh`) puede aplicarse a un cliente
  puntual o a todos los que estén bajo este modelo, sin reconstruir nada
  en el VPS (se sigue descargando de ghcr.io como ya funciona hoy).
- El primer cliente bajo este modelo (agrohidalgo) queda funcionando de
  punta a punta: DNS, HTTPS, base de datos inicial, login de admin.

## Non-goals / anti-goals

- **No se migran `samagro`, `inv` ni `agrofertil`** a este modelo en este
  trabajo — tienen datos reales en producción y migrar sus volúmenes de
  MySQL sin perderlos es un trabajo aparte, con su propio cuidado. Quedan
  intactos en sus carpetas actuales.
- **No se automatiza el sistema de migraciones SQL.** Sigue siendo manual
  y numerado (`bd/NNN_descripcion.sql` + `bd/MIGRACIONES.md`), igual que
  hoy. Lo único que cambia es que aplicar una migración a "todos los
  clientes" pasa a ser un loop sobre `instancias/*.env` en vez de visitar
  carpetas separadas por SSH.
- **No se toca código de `backend/` ni `frontend/`** — este trabajo es
  solo de orquestación de despliegue (scripts, Nginx, Docker Compose).
  `docker-compose.yml` no necesita cambios: ya está parametrizado con
  `DOMAIN`, `HOST_PORT`, `DB_*`, etc.
- Sería un error considerar esto "terminado" dejando a `samagro` como el
  único cliente real sin camino de migración documentado — aunque la
  migración se haga después, este spec debe dejar claro que es un paso
  pendiente, no una decisión de abandonarla.

## Constraints

- Debe convivir en el mismo VPS compartido (RAM limitada) sin afectar a
  los proyectos de otros clientes ni a las 3 instancias agro actuales.
- `instancias/*.env` nunca se sube a git — mismo tratamiento que
  `bd/*.sql` (gitignorado, se gestiona solo en el VPS).
- El prefijo de proyecto Docker usa el mismo nombre que ya usan las
  imágenes en ghcr.io (`agrov1-backend`, `agrov1-frontend`): los
  proyectos de Compose se llaman `agrov1-<nombre>`.
- Sigue sin construirse nada en el VPS: `deploy.sh` solo hace
  `git pull` + `docker compose pull` + `docker compose up -d`, como hoy.

## Decisiones (como builder, a definir en el plan de implementación)

- **Ubicación del clon único:** `/home/ubuntu/SISTEMAS/AGROV1` (carpeta
  nueva, distinta a `samagro/`, `inv/`, `agrofertil/`).
- **Carpeta `instancias/`** en la raíz del repo, con un archivo
  `<nombre>.env` por cliente (mismas variables que `.env.example` hoy:
  `DOMAIN`, `HOST_PORT`, `DB_*`, `JWT_SECRET`, `BANCO_ECONOMICO_*`,
  `PERSONAS_API_*`). Se agrega a `.gitignore`.
- **`deploy/nueva-instancia.sh <nombre> <dominio>`**: script nuevo que
  reemplaza a `nuevo-cliente.sh` para este modelo. Busca el próximo
  puerto libre revisando `instancias/*.env` (no carpetas hermanas),
  genera `instancias/<nombre>.env` a partir de `.env.example` con
  contraseñas/JWT al azar, publica el vhost de Nginx
  (`deploy/nginx-vhost.conf.example`, mismo formato que hoy) y corre
  certbot.
- **`deploy.sh` reescrito** para aceptar un nombre de instancia opcional:
  - Sin argumento: recorre todos los `instancias/*.env` y actualiza cada
    uno (`docker compose -p agrov1-<nombre> --env-file
    instancias/<nombre>.env pull/up`).
  - Con nombre (`./deploy.sh agrohidalgo`): actualiza solo esa instancia.
  - Mantiene el mismo comportamiento de espera de imágenes de ghcr.io y
    limpieza de imágenes colgantes que ya tiene hoy.
- **`bd/produccion.sql`**: como ahora hay un solo clon, se copia una sola
  vez (no una vez por cliente). Sigue gitignorado.
- **Primer cliente real:** `agrohidalgo` / `agrohidalgo.rusoft.dev`,
  usado para probar el flujo completo (alta, deploy, HTTPS, login).

## Qué queda para el plan de implementación

- Contenido exacto de `deploy/nueva-instancia.sh` y del `deploy.sh`
  reescrito (basarse en `nuevo-cliente.sh`/`deploy.sh` actuales,
  adaptando las partes de "carpeta hermana" a "archivo en `instancias/`").
- Actualizar `.gitignore` para incluir `instancias/`.
- Documentar el flujo nuevo (puede reemplazar o complementar
  `deploy/NUEVO-CLIENTE.md`).
- Probar de punta a punta con `agrohidalgo.rusoft.dev`: DNS → alta →
  deploy → certbot → login de admin.
- Dejar anotado en `MIGRACIONES.md` o en la documentación de deploy que
  migrar `samagro`/`inv`/`agrofertil` a este modelo es un trabajo
  pendiente aparte (no de este spec).
