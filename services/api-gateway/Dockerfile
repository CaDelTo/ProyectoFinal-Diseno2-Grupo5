# api-gateway — spec 002
# Nginx (routing + rate limit) + Node.js middleware (JWT validate + health)
# ======================================================================= Stage 1: build middleware
FROM datospersonales-base:latest AS build
COPY services/api-gateway ./services/api-gateway
RUN pnpm --filter api-gateway run build
RUN pnpm deploy --filter api-gateway --prod --legacy /deploy

# ======================================================================= Stage 2: runtime
FROM nginx:1.27-alpine AS runtime

RUN apk add --no-cache nodejs curl

WORKDIR /app
COPY --from=build /deploy .

# Nginx config (uses envsubst for RATE_LIMIT_* vars)
COPY services/api-gateway/nginx/nginx.conf /etc/nginx/nginx.conf.template

# Startup: substitute env vars in nginx.conf, then launch both processes
COPY services/api-gateway/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
