'use client';

import { SessionProvider } from 'next-auth/react';
import { useState, useEffect } from 'react';

/**
 * AuthProvider wraps next-auth's SessionProvider.
 * During SSR/build (static generation), we skip rendering SessionProvider
 * to avoid "Invalid URL" errors when NEXTAUTH_URL is not available.
 * The session becomes available after client-side hydration.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // During SSR/build, render children without SessionProvider
    // to prevent URL construction errors
    return <>{children}</>;
  }

  return <SessionProvider>{children}</SessionProvider>;
}
