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

# Payment microservice
WORKDIR /app/services/payment
COPY services/payment/package.json services/payment/yarn.lock ./
COPY services/payment/prisma ./prisma
RUN yarn install --frozen-lockfile

COPY services/payment/tsconfig.json services/payment/custom.d.ts services/payment/app.ts ./
COPY services/payment/src ./src

RUN yarn prisma generate
RUN yarn build

EXPOSE 3000

ENV PAYMENT_PORT=3000

WORKDIR /app/services/payment
CMD ["sh", "-c", "yarn prisma migrate deploy && node dist/app.js"]
