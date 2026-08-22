// Ensure DATABASE_URL is defined before initializing Prisma Client
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./rankly.db';
}

const { PrismaClient } = require('@prisma/client');

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      log: ['warn', 'error']
    });
  }
  prisma = global.prisma;
}

// Helper to check connection
async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ SQLite Database connected successfully via Prisma ORM.');
  } catch (error) {
    console.error('❌ Failed to connect to SQLite database:', error.message);
  }
}

connectDatabase();

module.exports = prisma;
