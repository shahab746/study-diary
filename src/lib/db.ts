import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Lazy PrismaClient — avoids crashing during build when DATABASE_URL may be missing
function createPrismaClient() {
  return new PrismaClient({
    // log: ['query'], // Disabled - causes memory/stability issues in production
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV === 'production') globalForPrisma.prisma = db