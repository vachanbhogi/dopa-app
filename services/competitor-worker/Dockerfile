FROM oven/bun:1.3.14 AS build
WORKDIR /app
COPY package.json bun.lock tsconfig.json ./
RUN bun install --frozen-lockfile
COPY lib ./lib
COPY types ./types
COPY services/competitor-worker ./services/competitor-worker
RUN bun run worker:build

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/services/competitor-worker/dist ./services/competitor-worker/dist
USER node
CMD ["node", "services/competitor-worker/dist/services/competitor-worker/src/index.js"]
