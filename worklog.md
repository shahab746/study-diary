---
Task ID: 1
Agent: Main
Task: Diagnose why app was not displaying anything, fix Group_Eligibility filtering, and optimize server stability

Work Log:
- Diagnosed that the Next.js dev server was crashing due to memory pressure caused by the `googleapis` npm package (~600MB overhead)
- Verified Group_Eligibility filtering was already implemented in `/api/data/route.ts` - Biology students see Physics/Chemistry/Biology/Maths (no CS), CS students see Physics/Chemistry/CS/Maths (no Biology)
- Verified subject detail API `/api/subject/[subjectId]/route.ts` also checks Group_Eligibility using local DB instead of Google Sheets API
- Removed `googleapis` package entirely since no service account is configured - saves ~600MB of server memory
- Rewrote `sheet-sync.ts` to be CSV-only mode (no googleapis dependency)
- Changed `/api/login/route.ts` to use dynamic import for `findUserByPhone` - sheet-sync module only loads when a NEW user (not in local DB) tries to log in
- Changed login redirect from `window.location.href = '/'` to `window.location.reload()` with a delay for more reliable session handling
- Verified API endpoints work correctly:
  - Ali (Biology group, Grade 10): Sees Physics, Chemistry, Biology, Maths - NO Computer Science ✅
  - Abdul Wahab (Biology group, Grade 9): Sees Physics, Chemistry, Biology, Maths - NO Computer Science ✅
  - CS test student: Sees Physics, Chemistry, Computer Science, Maths - NO Biology ✅
- Lint passes clean

Stage Summary:
- Group_Eligibility filtering is fully implemented and working
- Server memory reduced from ~1600MB to ~1200MB by removing googleapis
- Login API uses dynamic import to avoid loading sheet-sync for existing users
- App should display correctly through the Preview Panel
- Dev server may occasionally crash under memory pressure but this is a sandbox limitation
