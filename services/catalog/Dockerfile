FROM node:18-alpine

RUN apk add --no-cache openssl

WORKDIR /app

# Shared package (@ecommerce/messaging)
COPY packages/messaging/package.json packages/messaging/yarn.lock packages/messaging/
WORKDIR /app/packages/messaging
RUN yarn install --frozen-lockfile
COPY packages/messaging/tsconfig.json packages/messaging/jest.config.js packages/messaging/
COPY packages/messaging/src packages/messaging/src
RUN yarn build

# Catalog microservice
WORKDIR /app/services/catalog
COPY services/catalog/package.json services/catalog/yarn.lock ./
COPY services/catalog/prisma ./prisma
RUN yarn install --frozen-lockfile

COPY services/catalog/tsconfig.json services/catalog/custom.d.ts services/catalog/app.ts ./
COPY services/catalog/src ./src

RUN yarn prisma generate
RUN yarn build

EXPOSE 3000

ENV CATALOG_PORT=3000

WORKDIR /app/services/catalog
CMD ["sh", "-c", "yarn prisma migrate deploy && node dist/app.js"]
