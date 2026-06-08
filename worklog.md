# Study Diary — Worklog

---
Task ID: 0-1
Agent: main
Task: Phase 0-1 — Install Dexie.js, set up IndexedDB schema, wire into Zustand store

Work Log:
- Installed dexie@4.4.3
- Created src/lib/local-db.ts with IndexedDB schema (students, subjects, chapters, topics, progress, specialCourses, config, pacingGoals, syncMeta)
- Created src/lib/use-local-db.ts React hook wrapping Dexie operations
- Modified src/lib/store.ts to import localDB and write progress/pacing to IndexedDB alongside API calls
- fetchData caches student profile and progress to IndexedDB after API response

Stage Summary:
- IndexedDB foundation is live alongside the old Turso DB
- No breaking changes — both systems work in parallel

---
Task ID: 2-5
Agent: main
Task: Phases 2-5 — Zero-Database Migration (Sheets-only reads, IndexedDB-only writes, remove DB code)

Work Log:
- Phase 2a: Added deterministic ID generators (makeSubjectId, makeChapterId, makeTopicId) and buildCurriculumHierarchy() to sheet-sync.ts
- Phase 2b: Rewrote /api/data/route.ts to read entirely from Google Sheets (findUserByPhone, buildCurriculumHierarchy, fetchProgressFromSheet, fetchSpecialCoursesFromSheet)
- Phase 2c: Rewrote /api/subject/[subjectId]/route.ts to read from buildCurriculumHierarchy + fetchProgressFromSheet
- Phase 2d: Rewrote src/lib/auth.ts to use findUserByPhone only (no db import). Rewrote /api/login/route.ts similarly.
- Phase 3: Removed /api/progress and /api/pacing API calls from store.ts — progress and pacing are now IndexedDB-only
- Phase 4: Created /api/sync-progress/route.ts as placeholder for future Sheets write-back
- Phase 5a: Rewrote /api/progress/route.ts and /api/pacing/route.ts as no-ops returning success
- Phase 5b: Rewrote /api/health/route.ts to test Google Sheets connectivity instead of Turso. Rewrote /api/debug/route.ts to show Sheets data counts.
- Phase 5c: Deleted src/lib/db.ts (870 lines). Seed and sync routes were already deleted.
- Phase 5d: Removed prisma/ directory. No remaining imports of @/lib/db, @libsql/client, or @prisma/client.
- Phase 6: Lint passes cleanly. Build compiles successfully with 0 errors.

Stage Summary:
- ZERO DATABASE ARCHITECTURE IS LIVE
- Cost: $0.00/month forever (no Turso, no Prisma, no LibSQL)
- Google Sheets CSV = read-only CMS (curriculum, users, config)
- Client IndexedDB (Dexie.js) = student progress, pacing goals
- JWT-only auth (next-auth, no DB dependency)
- All API routes rewritten: /api/data, /api/subject, /api/login, /api/health, /api/debug
- Progress/pacing writes are client-side only (IndexedDB)
- Deterministic IDs ensure stable references across requests
