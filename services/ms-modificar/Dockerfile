# ms-modificar
# =================================================================== Stage 1: build
FROM datospersonales-base:latest AS build
COPY services/ms-modificar ./services/ms-modificar
RUN pnpm --filter ms-modificar run build
RUN pnpm deploy --filter ms-modificar --prod --legacy /deploy

# =================================================================== Stage 2: runtime
FROM node:20-alpine AS runtime
RUN apk add --no-cache openssl curl && addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=build /deploy .
USER app
ENV NODE_ENV=production
ENV PORT=4002
EXPOSE 4002
CMD ["node", "dist/main.js"]
