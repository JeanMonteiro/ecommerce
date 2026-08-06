FROM node:18-alpine

RUN apk add --no-cache openssl

WORKDIR /app

# Shared package (@ecommerce/auth-middleware)
COPY packages/auth-middleware/package.json packages/auth-middleware/yarn.lock packages/auth-middleware/
WORKDIR /app/packages/auth-middleware
RUN yarn install --frozen-lockfile
COPY packages/auth-middleware/tsconfig.json packages/auth-middleware/custom.d.ts packages/auth-middleware/
COPY packages/auth-middleware/src packages/auth-middleware/src
RUN yarn build

# Shared package (@ecommerce/messaging)
WORKDIR /app
COPY packages/messaging/package.json packages/messaging/yarn.lock packages/messaging/
WORKDIR /app/packages/messaging
RUN yarn install --frozen-lockfile
COPY packages/messaging/tsconfig.json packages/messaging/jest.config.js packages/messaging/
COPY packages/messaging/src packages/messaging/src
RUN yarn build

# Orders microservice
WORKDIR /app/services/orders
COPY services/orders/package.json services/orders/yarn.lock ./
COPY services/orders/prisma ./prisma
RUN yarn install --frozen-lockfile

COPY services/orders/tsconfig.json services/orders/custom.d.ts services/orders/app.ts ./
COPY services/orders/src ./src

RUN yarn prisma generate
RUN yarn build

EXPOSE 3000

ENV ORDERS_PORT=3000

WORKDIR /app/services/orders
CMD ["sh", "-c", "yarn prisma migrate deploy && node dist/app.js"]
