FROM node:current-alpine AS build
WORKDIR /home/node/app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
COPY patches ./patches
COPY scripts/copy-maplibre-worker.mjs ./scripts/
RUN npm ci --include=dev

COPY . .
RUN NEXT_STANDALONE=true npm run build

FROM node:current-alpine AS runtime
WORKDIR /home/node/app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=23000

COPY --from=build --chown=node:node /home/node/app/.next/standalone ./
COPY --from=build --chown=node:node /home/node/app/.next/static ./.next/static
COPY --from=build --chown=node:node /home/node/app/public ./public
COPY --from=build /home/node/app/scripts/docker-init-keys.mjs ./scripts/
RUN mkdir -m 700 /home/node/.fitness-dashboard-keys \
    && chown node:node /home/node/.fitness-dashboard-keys

VOLUME ["/home/node/.fitness-dashboard-keys"]
USER node
EXPOSE 23000
CMD ["node", "--import", "./scripts/docker-init-keys.mjs", "server.js"]
