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

# Inventory microservice
WORKDIR /app/services/inventory
COPY services/inventory/package.json services/inventory/yarn.lock ./
COPY services/inventory/prisma ./prisma
RUN yarn install --frozen-lockfile

COPY services/inventory/tsconfig.json services/inventory/custom.d.ts services/inventory/app.ts ./
COPY services/inventory/src ./src

RUN yarn prisma generate
RUN yarn build

EXPOSE 3000

ENV INVENTORY_PORT=3000

WORKDIR /app/services/inventory
CMD ["sh", "-c", "yarn prisma migrate deploy && node dist/app.js"]
