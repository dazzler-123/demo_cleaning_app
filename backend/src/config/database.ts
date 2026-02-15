import { PrismaClient } from '@prisma/client';
import { config } from './index.js';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: config.nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (config.nodeEnv !== 'production') globalForPrisma.prisma = prisma;

export async function connectDatabase(): Promise<void> {
  try {
    // Test the connection
    await prisma.$connect();
    console.log('[DB] MySQL connected successfully');
  } catch (error) {
    console.error('[DB] MySQL connection error:', error);
    // In Vercel/serverless, don't exit immediately - let it retry
    if (process.env.VERCEL !== '1') {
      process.exit(1);
    }
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    console.log('[DB] MySQL disconnected');
  } catch (error) {
    console.error('[DB] MySQL disconnection error:', error);
    throw error;
  }
}

export function isDatabaseConnected(): boolean {
  // Prisma doesn't have a readyState like mongoose, but we can check if client exists
  return prisma !== null && prisma !== undefined;
}

// Handle process termination
process.on('SIGINT', async () => {
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDatabase();
  process.exit(0);
});
