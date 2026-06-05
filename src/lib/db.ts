// CRITICAL: Set DATABASE_URL before importing Prisma.
// When using the Turso driver adapter on Vercel, DATABASE_URL is not used
// for actual queries (the adapter handles that), but Prisma's generated
// client still validates it at import time. If it's undefined, Prisma throws:
// "URL_INVALID: The URL 'undefined' is not in a valid format"
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dummy.db';
}

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
  const libsqlAuthToken = process.env.LIBSQL_AUTH_TOKEN;
  const isVercel = !!process.env.VERCEL;

  console.log(`📦 DB: Creating PrismaClient (LIBSQL_URL=${libsqlUrl ? 'set' : 'not set'}, AUTH_TOKEN=${libsqlAuthToken ? 'set' : 'not set'}, VERCEL=${isVercel})`);

  if (libsqlUrl) {
    try {
      // Turso / libSQL remote database (for Vercel deployment)
      console.log(`📦 DB: Attempting LibSQL connection to ${libsqlUrl}`);

      const libsql = createClient({
        url: libsqlUrl,
        authToken: libsqlAuthToken || undefined,
      });
      const adapter = new PrismaLibSQL(libsql);
      const client = new PrismaClient({ adapter } as any);
      console.log('📦 DB: PrismaClient created with LibSQL adapter (Turso)');
      return client;
    } catch (err) {
      console.error('📦 DB: Failed to create LibSQL adapter:', err);
      if (isVercel) {
        // On Vercel, we can't fall back to local SQLite
        throw new Error(
          `Failed to connect to Turso database: ${err instanceof Error ? err.message : String(err)}`
        );
      }
      console.log('📦 DB: Falling back to local SQLite');
    }
  }

  // Local SQLite database (for development / sandbox)
  console.log('📦 DB: PrismaClient created with local SQLite');
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
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
  },
});
