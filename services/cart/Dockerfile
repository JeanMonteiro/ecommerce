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

# Cart microservice
WORKDIR /app/services/cart
COPY services/cart/package.json services/cart/yarn.lock ./
COPY services/cart/prisma ./prisma
RUN yarn install --frozen-lockfile

COPY services/cart/tsconfig.json services/cart/custom.d.ts services/cart/app.ts ./
COPY services/cart/src ./src

RUN yarn prisma generate
RUN yarn build

EXPOSE 3000

ENV CART_PORT=3000

WORKDIR /app/services/cart
CMD ["sh", "-c", "yarn prisma migrate deploy && node dist/app.js"]
