import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Lazy PrismaClient singleton with Turso/libSQL support.
 *
 * - On Vercel: Set LIBSQL_URL and LIBSQL_AUTH_TOKEN to use Turso (remote SQLite).
 * - Locally: Falls back to DATABASE_URL (local SQLite file).
 * - Client is created lazily on first access to prevent crashes during build
 *   when environment variables may not be available.
 */
let _prismaClient: PrismaClient | undefined;

function createPrismaClient(): PrismaClient {
  const libsqlUrl = process.env.LIBSQL_URL;

  if (libsqlUrl) {
    // Turso / libSQL remote database (for Vercel deployment)
    const libsql = createClient({
      url: libsqlUrl,
      authToken: process.env.LIBSQL_AUTH_TOKEN,
    });
    const adapter = new PrismaLibSQL(libsql);
    return new PrismaClient({ adapter } as any);
  }

  // Local SQLite database (for development / sandbox)
  return new PrismaClient({
    // log: ['query'], // Disabled - causes memory/stability issues in production
  });
}

export function getDb(): PrismaClient {
  if (!_prismaClient) {
    _prismaClient = globalForPrisma.prisma ?? createPrismaClient();
    if (process.env.NODE_ENV === 'production') globalForPrisma.prisma = _prismaClient;
  }
  return _prismaClient;
}

// For backward compatibility — existing code uses `import { db } from '@/lib/db'`
// This creates the client on first property access (lazy via Proxy)
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getDb();
    const value = (client as Record<string | symbol, unknown>)[prop];
    if (typeof value === 'function') {
      return (value as Function).bind(client);
    }
    return value;
  },
});
