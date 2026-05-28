# Production image for Fly.io — Astro SSR (@astrojs/node standalone)
# Multi-stage: build inside the image so `fly deploy` works without a local dist/
# (Fly's remote builder respects .gitignore and omits dist/client and dist/server).

FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY astro.config.mjs tsconfig.json postcss.config.js tailwind.config.js ./
COPY public ./public
COPY src ./src

RUN npm run build

FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 8080

CMD ["node", "dist/server/entry.mjs"]
