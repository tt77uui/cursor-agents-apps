# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /repo
COPY package.json package-lock.json tsconfig.base.json eslint.config.js ./
COPY app-01-shop-quote-studio/package.json ./app-01-shop-quote-studio/
COPY app-02-shift-stock-lite/package.json ./app-02-shift-stock-lite/
COPY app-01-shop-quote-studio ./app-01-shop-quote-studio
RUN npm ci && npm run build -w app-01-shop-quote-studio

FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /repo
COPY package.json package-lock.json ./
COPY app-01-shop-quote-studio/package.json ./app-01-shop-quote-studio/
COPY app-02-shift-stock-lite/package.json ./app-02-shift-stock-lite/
RUN npm ci --omit=dev
COPY --from=build /repo/app-01-shop-quote-studio/server/dist ./app-01-shop-quote-studio/server/dist
COPY --from=build /repo/app-01-shop-quote-studio/client/dist ./app-01-shop-quote-studio/client/dist
WORKDIR /repo/app-01-shop-quote-studio
ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001
CMD ["node", "server/dist/server.js"]
