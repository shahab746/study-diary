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

---
Task ID: 7
Agent: Main Agent
Task: Add registration tab alongside login with toggle

Work Log:
- Planned registration architecture: Google Apps Script (free REST API) for writing to Sheets + file-based JSON store for server cache
- Created `src/lib/registered-users.ts` — file-backed JSON store (.data/registered-users.json) + Apps Script integration
  - Initially used in-memory Map, but found critical bug: Next.js Turbopack isolates module state across route handlers
  - Fixed by switching to file-based JSON store that all route handlers share
- Created `src/app/api/register/route.ts` — POST endpoint for registration + GET for debug
  - Validates inputs (name, phone 11 digits, PIN 4-6 digits)
  - Checks duplicate in Google Sheets + local store
  - Saves to file-backed store, attempts Apps Script write if URL configured
- Created `docs/google-apps-script.js` — deployable Google Apps Script for writing users to Sheets
- Rebuilt `src/components/auth/LoginPage.tsx` with Login/Register toggle
  - Pill-style toggle with gradient highlight on active tab
  - LoginForm component (phone + PIN)
  - RegisterForm component (name, phone, PIN, confirm PIN, grade, board, field, academic group)
  - Auto-login after successful registration
  - "Account Created!" success screen with auto-redirect
  - Client-side validation with green checkmarks
- Updated `src/lib/auth.ts` — uses findRegisteredUserByPhone (checks Sheets → file store)
- Updated `src/app/api/login/route.ts` — same dual lookup
- Updated `src/app/api/data/route.ts` — checks registered users cache before falling back to first Sheet user
- Updated `src/lib/sheet-sync.ts` — added pacingGoal field to SheetUser (column 10 was being skipped)
- Updated `src/app/api/health/route.ts` — added registration status (serverCacheUsers, appsScriptConfigured)
- Updated `.env` — added GOOGLE_APPS_SCRIPT_URL (commented out)
- Added `.data/` to `.gitignore`

Stage Summary:
- Registration feature fully working: toggle between Login/Register, register new user, auto-login, dashboard shows correct name
- Browser tested: registered "Ahmed Khan" (03123456789), auto-login worked, dashboard showed correct name
- Key new files: src/lib/registered-users.ts, src/app/api/register/route.ts, docs/google-apps-script.js
- Key modified files: src/components/auth/LoginPage.tsx, src/lib/auth.ts, src/app/api/login/route.ts, src/app/api/data/route.ts, src/lib/sheet-sync.ts, src/app/api/health/route.ts
- Architecture: Google Sheets (read) → File-backed JSON store (registered users) → Google Apps Script (write, optional)
