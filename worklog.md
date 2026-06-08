---
Task ID: 2-6
Agent: Main Agent
Task: Execute all remaining phases of zero-database migration (Phase 2-6)

Work Log:
- Phase 2: Already complete — all API routes use Google Sheets CSV, no DB reads
- Phase 5: Already complete — db.ts deleted, prisma removed, package.json clean
- Phase 5b Cleanup: Removed stale serverExternalPackages from next.config.ts, fixed stale comments in AuthProvider.tsx and health route, regenerated lock files (4 stale packages removed), added allowedDevOrigins config
- Phase 3: Implemented offline & resilience features
  - Added offline mutation queue (localStorage-based) in store.ts
  - Added enqueueMutation/dequeueByPayload/replayQueue functions
  - Auto-replays queued mutations when coming back online
  - Enhanced sync indicator in UI: shows green dot + "Synced HH:MM AM" when online, orange WifiOff icon + "Offline" when offline, orange RefreshCw + "N pending" when mutations queued
  - Tappable sync indicator triggers manual syncNow()
  - Added network event listeners (online/offline) in store
  - Enhanced PWA runtime caching in next.config.ts: added /api/data, /api/subject, /api/health, /_next/static patterns
- Phase 4: Made /api/sync-progress functional
  - POST endpoint: accepts progress records, stores in server-side cache, merges with Google Sheets data
  - GET endpoint: returns consolidated progress (server cache + Google Sheets)
  - CSV export: GET with ?format=csv returns downloadable CSV
  - Immediate sync on each toggleTaskComplete/toggleSubjectDetailTopic with auto-dequeue on success
- Phase 6: Verified all flows work
  - Lint passes clean
  - Browser tested: login, dashboard, task toggle, courses, timer
  - Sync indicator works: shows "Synced 09:18 AM" green, "1 pending" orange, "Offline" with WifiOff icon
  - API endpoints verified: /api/data, /api/health, /api/sync-progress POST/GET/CSV all working
  - Google Sheets connectivity confirmed: 3 users, 1029 curriculum rows, 9 subjects

Stage Summary:
- All phases complete. The app is now fully zero-database: Google Sheets (read) + IndexedDB (write) + offline queue + sync endpoint
- Key files modified: src/lib/store.ts, src/app/page.tsx, next.config.ts, src/app/api/sync-progress/route.ts, src/components/auth/AuthProvider.tsx, src/app/api/health/route.ts
- Architecture: Google Sheets CSV → Server cache → Client IndexedDB → Offline queue → Auto-sync on reconnect
