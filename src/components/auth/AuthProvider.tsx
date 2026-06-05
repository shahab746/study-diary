'use client';

import { SessionProvider } from 'next-auth/react';

/**
 * AuthProvider wraps next-auth's SessionProvider.
 * Always renders SessionProvider to ensure useSession() works.
 * The SSR/build safety is handled by not-found.tsx (bypasses root layout)
 * and the lazy PrismaClient (doesn't crash on import).
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
