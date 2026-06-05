import { NextResponse } from 'next/server';

/**
 * Health check endpoint — tests the Turso/libSQL database connection.
 * GET /api/health
 *
 * Returns diagnostic info about environment variables and DB connectivity.
 * This helps debug "Unable to connect" errors on Vercel.
 */
export async function GET() {
  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: !!process.env.VERCEL,
      DATABASE_URL: process.env.DATABASE_URL ? `set (${process.env.DATABASE_URL.substring(0, 20)}...)` : 'not set',
      LIBSQL_URL: process.env.LIBSQL_URL ? `set (${process.env.LIBSQL_URL.substring(0, 30)}...)` : 'not set',
      LIBSQL_AUTH_TOKEN: process.env.LIBSQL_AUTH_TOKEN ? `set (${process.env.LIBSQL_AUTH_TOKEN.substring(0, 8)}...)` : 'not set',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'set' : 'not set',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'not set',
    },
  };

  // Test 1: Check if @libsql/client can connect directly
  if (process.env.LIBSQL_URL) {
    try {
      const { createClient } = await import('@libsql/client');
      const libsql = createClient({
        url: process.env.LIBSQL_URL,
        authToken: process.env.LIBSQL_AUTH_TOKEN || undefined,
      });
      const result = await libsql.execute('SELECT 1 as test');
      diagnostics.libsqlDirectConnection = {
        status: 'ok',
        result: result.rows[0],
      };
      libsql.close();
    } catch (err) {
      diagnostics.libsqlDirectConnection = {
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
        errorType: err instanceof Error ? err.constructor.name : 'Unknown',
      };
    }
  } else {
    diagnostics.libsqlDirectConnection = { status: 'skipped', reason: 'LIBSQL_URL not set' };
  }

  // Test 2: Check if Prisma with adapter can query
  try {
    const { db } = await import('@/lib/db');
    const studentCount = await db.student.count();
    diagnostics.prismaConnection = {
      status: 'ok',
      studentCount,
    };
  } catch (err) {
    diagnostics.prismaConnection = {
      status: 'failed',
      error: err instanceof Error ? err.message : String(err),
      errorType: err instanceof Error ? err.constructor.name : 'Unknown',
      stack: err instanceof Error ? err.stack?.split('\n').slice(0, 5) : undefined,
    };
  }

  // Test 3: Check if Student table exists
  if (process.env.LIBSQL_URL) {
    try {
      const { createClient } = await import('@libsql/client');
      const libsql = createClient({
        url: process.env.LIBSQL_URL,
        authToken: process.env.LIBSQL_AUTH_TOKEN || undefined,
      });
      const tables = await libsql.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
      diagnostics.tables = tables.rows.map((r: any) => r.name);
      libsql.close();
    } catch (err) {
      diagnostics.tables = {
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  const hasErrors = (diagnostics.libsqlDirectConnection as any)?.status === 'failed' ||
                    (diagnostics.prismaConnection as any)?.status === 'failed';

  return NextResponse.json(diagnostics, {
    status: hasErrors ? 500 : 200,
  });
}
