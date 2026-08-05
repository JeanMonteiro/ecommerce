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

# Auth microservice
WORKDIR /app/services/auth
COPY services/auth/package.json services/auth/yarn.lock ./
COPY services/auth/prisma ./prisma
RUN yarn install --frozen-lockfile

COPY services/auth/tsconfig.json services/auth/custom.d.ts services/auth/app.ts ./
COPY services/auth/src ./src

RUN yarn prisma generate
RUN yarn build

EXPOSE 3000

ENV AUTH_PORT=3000

WORKDIR /app/services/auth
CMD ["sh", "-c", "yarn prisma migrate deploy && node dist/app.js"]
