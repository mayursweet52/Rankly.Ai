# ─── 1. BASE IMAGE ───
FROM node:20-slim

# ─── 2. SYSTEM DEPENDENCIES (OpenSSL for Prisma, Python for SSL mailer) ───
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    python3 \
    python3-pip \
    && ln -s /usr/bin/python3 /usr/bin/python \
    && rm -rf /var/lib/apt/lists/*

# ─── 3. WORK DIRECTORY ───
WORKDIR /app

# ─── 4. INSTALL NPM DEPENDENCIES ───
COPY package*.json ./
COPY prisma ./prisma/

RUN npm install --legacy-peer-deps
RUN npx prisma generate

# ─── 5. COPY SOURCE CODE ───
COPY . .

# ─── 6. ENVIRONMENT & PORT ───
ENV PORT=3000
ENV NODE_ENV=production
EXPOSE 3000

# ─── 7. HEALTHCHECK & START COMMAND ───
CMD ["node", "server.js"]
