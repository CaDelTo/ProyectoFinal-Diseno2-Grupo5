# ms-log
# =================================================================== Stage 1: build
FROM datospersonales-base:latest AS build
COPY services/ms-log ./services/ms-log
RUN pnpm --filter ms-log run build
RUN pnpm deploy --filter ms-log --prod --legacy /deploy

# =================================================================== Stage 2: runtime
FROM node:20-alpine AS runtime
RUN apk add --no-cache openssl curl && addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=build /deploy .
USER app
ENV NODE_ENV=production
ENV PORT=4005
EXPOSE 4005
CMD ["node", "dist/main.js"]
