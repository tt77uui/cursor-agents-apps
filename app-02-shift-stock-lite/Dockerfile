# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /repo
COPY package.json package-lock.json tsconfig.base.json eslint.config.js ./
COPY app-01-shop-quote-studio/package.json ./app-01-shop-quote-studio/
COPY app-02-shift-stock-lite/package.json ./app-02-shift-stock-lite/
COPY app-02-shift-stock-lite ./app-02-shift-stock-lite
RUN npm ci && npm run build -w app-02-shift-stock-lite

FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /repo
COPY package.json package-lock.json ./
COPY app-01-shop-quote-studio/package.json ./app-01-shop-quote-studio/
COPY app-02-shift-stock-lite/package.json ./app-02-shift-stock-lite/
RUN npm ci --omit=dev
COPY --from=build /repo/app-02-shift-stock-lite/server/dist ./app-02-shift-stock-lite/server/dist
COPY --from=build /repo/app-02-shift-stock-lite/client/dist ./app-02-shift-stock-lite/client/dist
WORKDIR /repo/app-02-shift-stock-lite
ENV NODE_ENV=production
ENV PORT=3002
EXPOSE 3002
CMD ["node", "server/dist/server.js"]
