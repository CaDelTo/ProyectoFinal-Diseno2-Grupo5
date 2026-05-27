# ms-borrar
# =================================================================== Stage 1: build
FROM datospersonales-base:latest AS build
COPY services/ms-borrar ./services/ms-borrar
RUN pnpm --filter ms-borrar run build
RUN pnpm deploy --filter ms-borrar --prod --legacy /deploy

# =================================================================== Stage 2: runtime
FROM node:20-alpine AS runtime
RUN apk add --no-cache openssl curl && addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=build /deploy .
USER app
ENV NODE_ENV=production
ENV PORT=4004
EXPOSE 4004
CMD ["node", "dist/main.js"]
