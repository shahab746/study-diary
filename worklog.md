---
Task ID: 1
Agent: Main
Task: Fix Vercel build error (TypeError: Invalid URL during prerendering of /_not-found)

Work Log:
- Diagnosed root cause: next-auth SessionProvider tries to construct URL from NEXTAUTH_URL during SSG, but env var is missing during Vercel build
- Created src/app/not-found.tsx (self-contained 404 page that bypasses root layout providers)
- Fixed AuthProvider to skip SessionProvider during SSR/build (prevents Invalid URL error)
- Made PrismaClient lazy via Proxy (only created on first access, not at import time)
- Added Turso/libSQL adapter support for Vercel (remote SQLite-compatible database)
- Added NEXTAUTH_SECRET fallback for build time
- Added postinstall script for prisma generate
- Added .env.example with documentation
- Installed @prisma/adapter-libsql and @libsql/client packages
- Updated prisma/schema.prisma to support driver adapters
- Pushed all changes to GitHub (commit f4f5315)

Stage Summary:
- Build error fix pushed to shahab746/lecture_diary repo
- User needs to: (1) set up Turso database, (2) configure env vars on Vercel, (3) redeploy
- GitHub PAT was shared publicly - user should revoke it
