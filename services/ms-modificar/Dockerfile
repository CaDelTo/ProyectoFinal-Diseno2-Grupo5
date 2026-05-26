# ms-modificar — spec 006
# =================================================================== Stage 1: build
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY libs ./libs
COPY services/ms-modificar ./services/ms-modificar

RUN corepack enable && pnpm install --frozen-lockfile
RUN pnpm --filter ms-modificar run build

# =================================================================== Stage 2: runtime
FROM node:20-alpine AS runtime
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app

COPY --from=build /app/services/ms-modificar/dist ./dist
COPY --from=build /app/services/ms-modificar/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/libs/shared/db/generated ./libs/shared/db/generated

USER app
ENV NODE_ENV=production
ENV PORT=4002
EXPOSE 4002

CMD ["node", "dist/main.js"]
