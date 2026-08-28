# ── Etapa 1: build de la SPA (Vite) ─────────────────────────────────────────
FROM node:20-bookworm-slim AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# En producción, el frontend y el backend se sirven bajo el mismo origen
# (Nginx hace de proxy interno hacia el contenedor backend), así que basta
# con una ruta relativa: no hace falta hornear el dominio en el build.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ── Etapa 2: servir con Nginx ────────────────────────────────────────────────
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
