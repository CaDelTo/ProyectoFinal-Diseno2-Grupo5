# ms-borrar — spec 007
# =================================================================== Stage 1: build
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY libs ./libs
COPY services/ms-borrar ./services/ms-borrar

RUN corepack enable && pnpm install --frozen-lockfile
RUN pnpm --filter ms-borrar run build

# =================================================================== Stage 2: runtime
FROM node:20-alpine AS runtime
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app

COPY --from=build /app/services/ms-borrar/dist ./dist
COPY --from=build /app/services/ms-borrar/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/libs/shared/db/generated ./libs/shared/db/generated

USER app
ENV NODE_ENV=production
ENV PORT=4004
EXPOSE 4004

CMD ["node", "dist/main.js"]
