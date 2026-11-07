FROM node:26-alpine

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

# Actualiza los paquetes del sistema (OpenSSL, musl, etc.) antes de bajar privilegios.
RUN apk upgrade --no-cache

COPY --chown=node:node server.js ./server.js
COPY --chown=node:node music-player ./music-player

USER node

EXPOSE 3000

CMD ["node", "server.js"]
