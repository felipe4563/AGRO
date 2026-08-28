FROM node:20-bookworm-slim

# mysql-client: necesario para que el backup (mysqldump) funcione en producción.
RUN apt-get update \
    && apt-get install -y --no-install-recommends default-mysql-client \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# whatsapp-web.js (dependencia no usada en producción, ver backend/watsap/) arrastra
# a puppeteer, que por defecto descarga un Chromium de ~300MB. Se omite esa descarga.
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

RUN mkdir -p uploads backups

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "app.js"]
