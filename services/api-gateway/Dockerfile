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

# API gateway
WORKDIR /app/services/api-gateway
COPY services/api-gateway/package.json services/api-gateway/yarn.lock ./
RUN yarn install --frozen-lockfile

COPY services/api-gateway/tsconfig.json services/api-gateway/custom.d.ts services/api-gateway/app.ts ./
RUN yarn build

EXPOSE 3000

ENV GATEWAY_PORT=3000
ENV AUTH_SERVICE_URL=http://auth:3000

CMD ["node", "dist/app.js"]
