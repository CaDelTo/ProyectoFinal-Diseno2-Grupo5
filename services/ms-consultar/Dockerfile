# ms-consultar
# =================================================================== Stage 1: build
FROM datospersonales-base:latest AS build
COPY services/ms-consultar ./services/ms-consultar
RUN pnpm --filter ms-consultar run build
RUN pnpm deploy --filter ms-consultar --prod --legacy /deploy

# =================================================================== Stage 2: runtime
FROM node:20-alpine AS runtime
RUN apk add --no-cache openssl curl && addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=build /deploy .
USER app
ENV NODE_ENV=production
ENV PORT=4003
EXPOSE 4003
CMD ["node", "dist/main.js"]
