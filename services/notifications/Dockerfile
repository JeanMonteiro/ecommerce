FROM node:18-alpine

WORKDIR /app

# Shared package (@ecommerce/messaging)
COPY packages/messaging/package.json packages/messaging/yarn.lock packages/messaging/
WORKDIR /app/packages/messaging
RUN yarn install --frozen-lockfile
COPY packages/messaging/tsconfig.json packages/messaging/jest.config.js packages/messaging/
COPY packages/messaging/src packages/messaging/src
RUN yarn build

# Notifications microservice
WORKDIR /app/services/notifications
COPY services/notifications/package.json services/notifications/yarn.lock ./
RUN yarn install --frozen-lockfile

COPY services/notifications/tsconfig.json services/notifications/custom.d.ts services/notifications/app.ts ./
COPY services/notifications/src ./src

RUN yarn build

EXPOSE 3000

ENV NOTIFICATIONS_PORT=3000

WORKDIR /app/services/notifications
CMD ["node", "dist/app.js"]
