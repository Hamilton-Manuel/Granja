# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e AS base
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS dependencias
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencias AS compilacion
COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json ./
COPY src ./src
# Prisma generate solo necesita un datasource sintáctico; no conecta a SQL.
RUN DATABASE_URL='sqlserver://localhost:1433;database=compilacion;encrypt=true' npm run build

FROM compilacion AS artefactos-operaciones
RUN find dist -type f \( -name '*.test.js*' -o -name '*.integration.test.js*' -o -name '*.map' \) -delete && rm -rf dist/src/testing

FROM base AS operaciones
ENV NODE_ENV=production
COPY --from=artefactos-operaciones /app/package.json ./
COPY --from=artefactos-operaciones /app/node_modules ./node_modules
COPY --from=artefactos-operaciones /app/dist ./dist
COPY --from=compilacion /app/prisma ./prisma
COPY prisma.config.ts ./
COPY docker/operaciones.mjs ./docker/operaciones.mjs
USER node
ENTRYPOINT ["node", "docker/operaciones.mjs"]
CMD ["status"]

FROM compilacion AS dependencias-produccion
# El peer opcional de @prisma/client no requiere Prisma CLI en ejecución.
# legacy-peer-deps se limita al prune; npm ci mantiene el lockfile original.
RUN npm prune --omit=dev --legacy-peer-deps && find dist -type f \( -name '*.test.js*' -o -name '*.integration.test.js*' -o -name '*.map' \) -delete && rm -rf dist/src/testing dist/src/scripts

FROM base AS runtime
ENV NODE_ENV=production PORT=3000
COPY --from=dependencias-produccion /app/package.json ./
COPY --from=dependencias-produccion /app/node_modules ./node_modules
COPY --from=dependencias-produccion /app/dist ./dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:3000/api/health/live').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "dist/src/server.js"]
