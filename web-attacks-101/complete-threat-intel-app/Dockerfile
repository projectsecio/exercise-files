# Production image for Fly.io — Astro SSR (@astrojs/node standalone)
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY dist ./dist

EXPOSE 8080

CMD ["node", "dist/server/entry.mjs"]
