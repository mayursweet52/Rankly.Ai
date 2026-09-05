# ─── 1. BASE IMAGE (Full Node 22 with OpenSSL 3.0 & Python built-in) ───
FROM node:22

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
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Create persistence directories
RUN mkdir -p /app/data /app/uploads /app/backups

# ─── 7. HEALTHCHECK & START COMMAND ───
CMD ["sh", "-c", "npx prisma db push && node server.js"]
