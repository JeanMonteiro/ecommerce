# Base image
FROM node:18-alpine


# # Set working directory
WORKDIR /usr/src/app

# RUN apt-get update
# RUN apt-get install -y openssl

# Copy package.json and yarn.lock
COPY package.json ./
COPY yarn.lock ./
# Add this line to copy the prisma directory
COPY prisma ./prisma

# Install dependencies
RUN yarn
# RUN apk add --no-cache libc6-compat

RUN yarn global add ts-node typescript

# Copy application files
COPY . .

# Expose the port
EXPOSE 3000
