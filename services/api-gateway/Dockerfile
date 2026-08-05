FROM node:18-alpine

WORKDIR /app/services/api-gateway

COPY services/api-gateway/package.json services/api-gateway/yarn.lock ./
RUN yarn install --frozen-lockfile

COPY services/api-gateway/tsconfig.json services/api-gateway/app.ts ./
RUN yarn build

EXPOSE 3000

ENV GATEWAY_PORT=3000
ENV AUTH_SERVICE_URL=http://auth:3000

CMD ["node", "dist/app.js"]
