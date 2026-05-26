# api-gateway — spec 002
# Nginx (routing + rate limit) + Node.js middleware (JWT validate + health)
# ======================================================================= Stage 1: build middleware
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY libs ./libs
COPY services/api-gateway ./services/api-gateway

RUN corepack enable && pnpm install --frozen-lockfile
RUN pnpm --filter api-gateway run build

# ======================================================================= Stage 2: runtime
FROM nginx:1.27-alpine AS runtime

# Install Node.js (same major as build)
RUN apk add --no-cache nodejs npm

RUN addgroup -S app && adduser -S app -G app

WORKDIR /app

COPY --from=build /app/services/api-gateway/dist    ./dist
COPY --from=build /app/services/api-gateway/package.json ./
COPY --from=build /app/node_modules                 ./node_modules
COPY --from=build /app/libs/shared/errors/dist      ./node_modules/@shared/errors/dist
COPY --from=build /app/libs/shared/logger/dist      ./node_modules/@shared/logger/dist

# Nginx config (uses envsubst for RATE_LIMIT_* vars)
COPY services/api-gateway/nginx/nginx.conf /etc/nginx/nginx.conf.template

# Startup: substitute env vars in nginx.conf, then launch both processes
COPY services/api-gateway/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
