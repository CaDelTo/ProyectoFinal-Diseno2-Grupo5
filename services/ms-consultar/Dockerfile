# ms-consultar — spec 005 (controlable: restart: 'no')
# =================================================================== Stage 1: build
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY libs ./libs
COPY services/ms-consultar ./services/ms-consultar

RUN corepack enable && pnpm install --frozen-lockfile
RUN pnpm --filter ms-consultar run build

# =================================================================== Stage 2: runtime
FROM node:20-alpine AS runtime
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app

COPY --from=build /app/services/ms-consultar/dist ./dist
COPY --from=build /app/services/ms-consultar/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/libs/shared/db/generated ./libs/shared/db/generated

USER app
ENV NODE_ENV=production
ENV PORT=4003
EXPOSE 4003

CMD ["node", "dist/main.js"]
