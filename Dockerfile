FROM node:current-alpine

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=23000

WORKDIR /home/node/app

COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node scripts/copy-maplibre-worker.mjs ./scripts/
COPY --chown=node:node patches ./patches
RUN npm ci --include dev

COPY --chown=node:node . .
RUN mkdir -p .next /home/node/.fitness-dashboard-keys \
    && chown -R node:node public .next /home/node/.fitness-dashboard-keys \
    && chown node:node /home/node/app \
    && chmod -R u+rwX public .next /home/node/.fitness-dashboard-keys

VOLUME ["/home/node/.fitness-dashboard-keys"]

USER node

EXPOSE 23000

CMD ["node", "scripts/docker-entrypoint.mjs"]
