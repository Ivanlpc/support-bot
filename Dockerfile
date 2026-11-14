FROM node:24.22.2-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig*.json example.config.json messages.json ./
COPY src ./src
RUN npm run build

FROM build AS test
RUN npm run typecheck && npm test

FROM node:24.22.2-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

FROM node:24.22.2-bookworm-slim AS runtime
ARG REVISION=unknown
LABEL org.opencontainers.image.source="https://github.com/Ivanlpc/support-bot" \
      org.opencontainers.image.revision=$REVISION
ENV NODE_ENV=production LOG_LEVEL=info LOG_DIR=/app/logs
WORKDIR /app
RUN mkdir /app/logs && chown node:node /app/logs
COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/src ./src
COPY --chown=node:node package.json example.config.json messages.json ./
USER node
HEALTHCHECK --interval=10s --timeout=5s --start-period=60s --retries=3 CMD ["node", "dist/healthcheck.js"]
CMD ["node", "--enable-source-maps", "dist/index.js"]
