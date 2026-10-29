FROM node:22-alpine AS base
WORKDIR /app

# Install OpenSSL for Prisma engine on Alpine
RUN apk add --no-cache openssl

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy source and prisma
COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src

EXPOSE 4000

CMD ["npx", "tsx", "src/index.ts"]
