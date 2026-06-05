---
Task ID: 1
Agent: Main Agent
Task: Replace mock data with real Google Sheets data with proper user auth

Work Log:
- Analyzed the entire codebase: page.tsx, store.ts, auth.ts, sheet-sync.ts, db.ts, all API routes
- Discovered the database tables didn't exist (Prisma schema was defined but never pushed)
- Pushed Prisma schema with `bun run db:push` to create all tables
- Seeded the database from Google Sheets via `/api/seed` - got 3 students, 9 subjects, 86 chapters, 1029 topics
- Fixed color mapping: DB stores color names ("Blue", "Teal") but UI needs hex codes ("#3B82F6", "#14B8A6") - added mapColor() in /api/data and /api/subject/[subjectId]
- Fixed icon mapping: DB stores emojis ("⚛️", "🧪") but UI needs Lucide component names ("atom", "beaker") - added mapIcon() with subject-name-based canonical mapping
- Fixed student status: Google Sheet has "true"/"false" but app expects "paid"/"free" - added normalizeStatus() in auth.ts, login route, and data route
- Added `isFree` field to SubjectDetailTopic type in store.ts
- Added `isLocked` field to SubjectProgress type in store.ts
- Fixed buggy `isFree` check in SubjectDetailView: `!topic.isFree !== undefined` → `topic.isFree === false`
- Added `isFree` field to subject detail API responses (both Turso and Prisma paths)
- Rebuilt Next.js app and verified all APIs work correctly
- Tested end-to-end: login → dashboard shows real data → courses view shows real subjects → progress API works

Stage Summary:
- Database is now populated with real Google Sheets data (3 students, 9 subjects, 86 chapters, 1029 topics)
- All API routes return properly mapped colors (hex) and icons (Lucide names)
- Student status normalization handles "true"/"false" → "paid"/"free"
- Auth flow works: phone/PIN login → NextAuth session → data fetch filtered by user's phone, grade, board, field, and academicGroup
- Browser verified: Login as Ali (03360883355) → Dashboard shows "Good afternoon, Ali." with 474 topics, 4 today tasks from real Physics/Chemistry/Biology/Mathematics curriculum
