/**
 * Prisma Client Singleton
 * Ensures only one instance of Prisma Client is created
 */

const { PrismaClient } = require('../generated/prisma');

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // In development, avoid creating multiple instances during hot-reload
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      log: ['error', 'warn'],
    });
  }
  prisma = global.prisma;
}

module.exports = prisma;
