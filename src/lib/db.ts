/**
 * Database stub — all database operations now go through Supabase.
 *
 * This file exists for backward compatibility with legacy route handlers
 * that import from '@/lib/db'. New code should use '@/lib/supabase' instead.
 *
 * @see src/lib/supabase.ts for the active database layer
 */

// Stub: the old db object is no longer used
// All user + progress operations → Supabase
// All curriculum reads → Google Sheets CSV

export const db = new Proxy({} as any, {
  get(_target, model) {
    return new Proxy({} as any, {
      get(_target, method) {
        return async (..._args: any[]) => {
          console.warn(`⚠️ db.${String(model)}.${String(method)} called — use Supabase instead`);
          return null;
        };
      },
    });
  },
});

export function getDb(): any {
  return db;
}
