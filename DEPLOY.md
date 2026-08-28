# Despliegue en VPS con Docker — samagro.rusoft.dev

Este stack asume que el VPS **ya tiene un proxy reverso** (nginx/Traefik/Caddy)
atendiendo otros dominios y encargado de los certificados SSL. Docker Compose
aquí **no** expone los puertos 80/443 directamente: solo publica el frontend
en `127.0.0.1:8080`, y ese proxy externo es quien apunta `samagro.rusoft.dev`
hacia ese puerto.

## 1. Requisitos en el VPS

- Docker Engine + plugin `docker compose` (`docker compose version`).
- El proyecto copiado/clonado en el VPS (ej. `/opt/sis-agro`).

## 2. Configurar variables de entorno

```bash
cp .env.example .env
nano .env   # completar DB_ROOT_PASSWORD, DB_USER, DB_PASSWORD, JWT_SECRET
```

Usa contraseñas y un `JWT_SECRET` distintos a los de desarrollo. `DOMAIN` ya
viene con `samagro.rusoft.dev`.

## 3. Levantar el stack

```bash
docker compose build
docker compose up -d
docker compose logs -f backend   # verificar que conecta a MySQL sin errores
```

La primera vez que se crea el volumen de MySQL, se importa automáticamente
`bd/produccion.sql` (estructura completa + los 3 roles — Administrador,
Cajero, Almacenero — con sus permisos, y 1 sucursal/caja/usuario de arranque).
En arranques posteriores el volumen ya existe y **no** se vuelve a importar.

## 4. Conectar el proxy reverso existente

Apunta `samagro.rusoft.dev` a `http://127.0.0.1:8080` (el contenedor `frontend`,
que sirve la SPA y reenvía internamente `/api` y `/uploads` al backend).
Ejemplo si el proxy es nginx:

```nginx
server {
    server_name samagro.rusoft.dev;
    listen 443 ssl;
    # ... certificados ya gestionados por tu proxy (certbot, etc.) ...

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 5. Primer inicio de sesión

Usuario administrador de arranque (definido en `bd/produccion.sql`):
contraseña temporal `CambiarAhora123!`. **Inicia sesión y cámbiala de
inmediato** desde Usuarios → Restablecer contraseña. Ajusta también los datos
de la sucursal de ejemplo y, desde Configuración, el nombre/logo del negocio.

## 6. Actualizar a una nueva versión

```bash
git pull   # o copiar los archivos nuevos al VPS
docker compose build
docker compose up -d
```

Los datos (MySQL, imágenes subidas, backups) viven en volúmenes con nombre
(`mysql_data`, `backend_uploads`, `backend_backups`) y sobreviven a
`docker compose up`/`build`. Solo se pierden con `docker compose down -v`.

## 7. Backups

El backend ya genera backups (`mysqldump`) programados vía el módulo
Backups del sistema, guardados en el volumen `backend_backups`. Para
respaldarlos fuera del VPS:

```bash
docker run --rm -v sis-agrov1_backend_backups:/data -v $(pwd):/out alpine \
  tar czf /out/backups.tar.gz -C /data .
```

(el prefijo `sis-agrov1_` depende del nombre de la carpeta del proyecto en
el VPS — verificar con `docker volume ls`).
