# ms-auth
# =================================================================== Stage 1: build
FROM datospersonales-base:latest AS build
COPY services/ms-auth ./services/ms-auth
RUN pnpm --filter ms-auth run build
RUN pnpm deploy --filter ms-auth --prod --legacy /deploy

# =================================================================== Stage 2: runtime
FROM node:20-alpine AS runtime
RUN apk add --no-cache openssl curl && addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=build /deploy .
USER app
ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000
CMD ["node", "dist/main.js"]
