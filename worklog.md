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

---
Task ID: 8
Agent: Main Agent
Task: Connect Google Apps Script URL and test Sheet writes

Work Log:
- User provided Apps Script URL: https://script.google.com/macros/s/AKfycbxLxivqsVWQHHiUA1dWKUfaO6o6D9W3nPzZiaE9DZuikxcilWUUbMR7kKjaEwsMXSKd/exec
- Added to .env as GOOGLE_APPS_SCRIPT_URL
- Fixed Apps Script POST redirect issue: Google returns 302 which converts POST→GET, losing the body
  - Updated appendUserToSheet() to use redirect:'manual', capture Location header, then GET the redirect URL
  - Changed Content-Type from application/json to text/plain;charset=utf-8 (works better with Apps Script)
- Tested registration: "Zain Ali" (03777111222) → syncedToSheet: true ✅
- Google Sheet user count went from 3 → 6 (confirmed Apps Script writes are working)
- Fixed local-db.ts file that was accidentally deleted — recreated from known content
- Fixed package.json dev script (was "next start" instead of "next dev")
- Fixed next.config.ts allowedDevOrigins (was regex object, needs to be string)
- Browser verified: registered "Hassan Raza" (03888999000), dashboard shows correct name after both auto-login and manual login

Stage Summary:
- Google Apps Script is LIVE and writing new users to the Google Sheet
- Full registration flow works end-to-end: Register → Save to file + Sheet → Auto-login → Dashboard shows correct name
- Sign out → Login with same credentials → Dashboard still shows correct name
- Sheet user count: 6 (3 original + 3 test registrations)

---
Task ID: 9
Agent: Main Agent
Task: Migrate from Google Sheets + Apps Script to Supabase for users & progress

Work Log:
- Diagnosed root cause of Sheets write failures: GOOGLE_APPS_SCRIPT_URL was missing from .env after server restart
- Fixed .env, updated Apps Script to handle is_paid column, fixed sheet-sync.ts status mapping
- Registration to Sheets started working, but user requested migration to Supabase for reliability
- Installed @supabase/supabase-js
- Created `src/lib/supabase.ts` — complete Supabase service layer with:
  - User CRUD operations (register, find, update)
  - Progress sync operations (sync, toggle, get)
  - Auto-migration from Sheets → Supabase on login
  - Graceful fallback when Supabase not configured
  - Smart isSupabaseConfigured() that rejects placeholder values
- Created `docs/supabase-migration.sql` — SQL to create users + progress tables in Supabase
- Updated `src/app/api/register/route.ts` — tries Supabase first, falls back to file store
- Updated `src/app/api/login/route.ts` — tries Supabase first, auto-migrates Sheet users on login
- Updated `src/lib/auth.ts` — same Supabase-first strategy with auto-migration
- Updated `src/app/api/sync-progress/route.ts` — persists to Supabase, falls back to in-memory cache
- Updated `src/app/api/data/route.ts` — reads user + progress from Supabase, curriculum from Sheets
- Created `src/app/api/migrate/route.ts` — one-time migration endpoint POST /api/migrate
- Updated `src/app/api/health/route.ts` — shows Supabase connection status
- Updated `.env` — added NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY placeholders
- Fixed `src/lib/local-db.ts` — recreated Dexie IndexedDB module that was missing
- All lint checks pass
- Tested in fallback mode: login works (Sheets), registration works (file store), auto-migration works

Stage Summary:
- Supabase integration complete — app works in dual mode:
  - Supabase configured: all reads/writes go to Supabase, curriculum from Sheets
  - Supabase not configured: falls back to Google Sheets + file store (current state)
- User needs to create Supabase project and add credentials to .env
- After adding credentials, existing Sheets users auto-migrate on login
- Progress is now persistent in Supabase (not lost on server restart!)
- Key new files: src/lib/supabase.ts, docs/supabase-migration.sql, src/app/api/migrate/route.ts
- Key modified files: register/route.ts, login/route.ts, auth.ts, sync-progress/route.ts, data/route.ts, health/route.ts

---
Task ID: 10
Agent: Main Agent
Task: Add user's Supabase credentials, run migration, test full flow

Work Log:
- Updated .env with real Supabase credentials (rvwtqlxogoiykdluognq.supabase.co)
- Verified both users and progress tables exist in Supabase (empty initially)
- Tested registration: "Supabase Test" (03009998807) → written to Supabase ✅
- Tested login: Ali (03360883355) from Supabase → instant (545ms vs 8s with Sheets) ✅
- Tested progress sync: 2 records synced and persisted to Supabase ✅
- Ran migration: 4 remaining users migrated from Sheets with 0 errors ✅
- Fixed date sanitization in migration (bad Google Sheet dates like #REF!, empty strings)
- Applied same fix to auto-migration in login/route.ts and auth.ts
- Verified all 8 users in Supabase database via REST API
- Tested /api/data endpoint: loads correctly with Supabase user + Sheets curriculum

Stage Summary:
- Supabase is LIVE and working! Full flow verified:
  - Registration → Supabase ✅ (instant, reliable)
  - Login → Supabase ✅ (545ms, 15x faster than Sheets)
  - Progress Sync → Supabase ✅ (persistent, survives restarts)
  - Dashboard → Supabase (user) + Sheets (curriculum) ✅
  - Migration → 8/8 users migrated ✅
- Architecture: Supabase (users + progress) + Google Sheets (curriculum read-only)
- All existing Google Sheets users are now in Supabase
