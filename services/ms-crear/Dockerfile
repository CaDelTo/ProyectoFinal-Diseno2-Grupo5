# ms-crear
# =================================================================== Stage 1: build
FROM datospersonales-base:latest AS build
COPY services/ms-crear ./services/ms-crear
RUN pnpm --filter ms-crear run build
RUN pnpm deploy --filter ms-crear --prod --legacy /deploy

# =================================================================== Stage 2: runtime
FROM node:20-alpine AS runtime
RUN apk add --no-cache openssl curl && addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=build /deploy .
USER app
ENV NODE_ENV=production
ENV PORT=4001
EXPOSE 4001
CMD ["node", "dist/main.js"]
