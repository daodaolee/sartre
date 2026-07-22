FROM node:24.11.0-bookworm-slim@sha256:76d0ed0ed93bed4f4376211e9d8fddac4d8b3fbdb54cc45955696001a3c91152 AS build

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/hub-api/package.json apps/hub-api/package.json
COPY apps/hub-worker/package.json apps/hub-worker/package.json
COPY apps/electron-app/package.json apps/electron-app/package.json
COPY apps/local-runtime/package.json apps/local-runtime/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/runtime-core/package.json packages/runtime-core/package.json
COPY packages/sdk/package.json packages/sdk/package.json

RUN pnpm install --frozen-lockfile --ignore-scripts
COPY tsconfig.base.json ./
COPY scripts/postgres scripts/postgres
RUN pnpm exec esbuild scripts/postgres/migrate.ts --bundle --platform=node --format=cjs --target=node24 --packages=bundle --outfile=.migration-job-build/runner.cjs --define:import.meta.url=undefined --log-level=warning

FROM node:24.11.0-bookworm-slim@sha256:76d0ed0ed93bed4f4376211e9d8fddac4d8b3fbdb54cc45955696001a3c91152 AS runtime

WORKDIR /app

COPY --from=build /app/.migration-job-build/runner.cjs scripts/postgres/runner.cjs
COPY apps/hub-api/src/infrastructure/database/migrations apps/hub-api/src/infrastructure/database/migrations
COPY docker/migration-job/entrypoint.sh /usr/local/bin/sartre-migrate

RUN chmod 0555 /usr/local/bin/sartre-migrate \
  && chown -R node:node /app

USER node
ENTRYPOINT ["/usr/local/bin/sartre-migrate"]
