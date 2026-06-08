# 🏗️ Study Diary — Architecture Strategy

## Current State (What We Have)

### Data Flow Today
```
Google Sheets (6 tabs) ──CSV──→ sheet-sync.ts ──→ Turso DB ←──→ API Routes ←──→ Frontend
                                    │                                        │
                                    └── in-memory TTL cache                  └── Zustand + localStorage
```

### Problems with Current Architecture
1. **Split-brain**: Google Sheets is the source of truth for reads, but writes go to Turso DB only. If you edit a topic in Sheets, the DB doesn't know until someone manually hits `/api/sync`.
2. **No progress write-back**: `writeProgressToSheet()` is a stub — student progress never reaches Google Sheets.
3. **Complex dual-DB layer**: ~870 lines of hand-rolled SQL in `db.ts` to work around Turso on Vercel vs SQLite locally.
4. **Cold start penalty**: In-memory cache in `sheet-sync.ts` is lost on every serverless cold start, meaning the first request is slow.
5. **Over-fetching**: `/api/data` loads the entire curriculum on every page load even though the student only needs their subjects.

---

## Target Architecture (What We Want)

### Core Principle: **Sheets = CMS, Local DB = App State**

```
┌─────────────────────────────────────────────────────┐
│                 GOOGLE SHEETS (CMS)                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ Subjects │ │ Chapters │ │  Topics  │ ← YOU EDIT  │
│  │  (tab)   │ │  (tab)   │ │  (tab)   │   HERE     │
│  └──────────┘ └──────────┘ └──────────┘            │
│  ┌──────────┐ ┌──────────┐                          │
│  │  Users   │ │  Config  │ ← STUDENT LIST +         │
│  │  (tab)   │ │  (tab)   │   APP CONFIG             │
│  └──────────┘ └──────────┘                          │
└──────────────────────┬──────────────────────────────┘
                       │ CSV export (free, no API keys)
                       ▼
┌─────────────────────────────────────────────────────┐
│              TURSO / LibSQL (App DB)                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ subjects │ │ chapters │ │  topics  │ ← synced   │
│  │          │ │          │ │          │   from sheet│
│  └──────────┘ └──────────┘ └──────────┘            │
│  ┌──────────┐ ┌──────────┐                          │
│  │ students │ │ progress │ ← WRITTEN BY APP         │
│  │          │ │          │   (never in sheets)      │
│  └──────────┘ └──────────┘                          │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│                NEXT.JS API LAYER                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ /api/data│ │/api/prog.│ │/api/sync │            │
│  │ (reads)  │ │ (writes) │ │(sheet→db)│            │
│  └──────────┘ └──────────┘ └──────────┘            │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│              FRONTEND (Zustand + React)              │
│  ┌────────────────┐  ┌────────────────┐             │
│  │  Server state  │  │  Local cache   │             │
│  │ (API data)     │  │ (localStorage) │             │
│  └────────────────┘  └────────────────┘             │
└─────────────────────────────────────────────────────┘
```

---

## The Strategy: 4 Phases

### Phase 1: Restructure Google Sheets (Content Layer) 📋

**Goal**: Make your Google Sheet the perfect CMS for curriculum data.

**Sheet Tab Structure:**

| Tab | Columns | Purpose |
|-----|---------|---------|
| **Subjects** | `id, name, grade, board, field, color, icon, order, totalTopics, chapterCount, groupEligibility` | Subject metadata |
| **Chapters** | `id, subject_id, chapter_number, name` | Chapter structure |
| **Topics** | `id, chapter_id, topic_number, name, video_url, pdf_link, is_free, day_number` | Individual lecture topics |
| **Users** | `phone, name, pin, grade, board, field, status, start_date, target_date, academic_group` | Student roster |
| **Special_Courses** | `id, name, subject, topic, video_link, pdf_link, grade, board, order` | Supplementary content |
| **Config** | `key, value` | App settings |

**Rules:**
- ✅ First row = exact column names (snake_case, no spaces)
- ✅ Sheet sharing = "Anyone with the link can view"
- ✅ You edit curriculum here — the app picks it up automatically
- ❌ Never store student progress in Sheets (that's the app's job)

**How to add/update content:**
1. Want to add a new video? → Edit the `Topics` tab, add a row
2. Want to add a new subject? → Add rows in `Subjects` + `Chapters` + `Topics`
3. Want to fix a broken link? → Just edit the cell in `Topics`
4. Changes go live within 5 minutes (or instantly via webhook)

---

### Phase 2: Smart Sync Engine (Sheets → DB) 🔄

**Goal**: Keep the DB in sync with Sheets automatically, without manual intervention.

**Current Problem**: Sync only happens on login or manual `/api/sync` call.

**New Sync Strategy:**

```
Trigger 1: Student logs in → sync user data from sheet
Trigger 2: Webhook from Google Apps Script → sync changed tab only  
Trigger 3: Scheduled ISR (every 5 min) → lightweight diff check
Trigger 4: Manual /api/sync → admin override
```

**Smart Diff Algorithm:**
```
1. Fetch sheet CSV
2. Hash each row → compare with stored hashes
3. Only upsert CHANGED rows (skip unchanged)
4. Delete rows that exist in DB but not in sheet (with safety check)
5. Log sync stats (added, updated, deleted, unchanged)
```

**What gets synced:**
| Direction | Data | Method |
|-----------|------|--------|
| Sheet → DB | Subjects, Chapters, Topics, Special Courses, Config | CSV → parse → diff → upsert |
| Sheet → DB | Users (roster + status) | CSV → parse → upsert (never delete) |
| DB only | Progress, Student pacing | Written by app, never synced to sheet |

**What does NOT get synced:**
| Data | Why |
|------|-----|
| Student progress | Only the app writes this. No need in Sheets. |
| Pacing goals | Personal to each student. |
| Completion dates | App-generated metadata. |

---

### Phase 3: Optimize the API Layer ⚡

**Goal**: Faster responses, less over-fetching, better caching.

**Current Problem**: `/api/data` loads EVERYTHING — all subjects, all chapters, all topics, all progress — even if the student only needs 3 subjects.

**New API Design:**

| Endpoint | What it returns | Cache |
|----------|----------------|-------|
| `GET /api/me` | Current student profile only | 5 min |
| `GET /api/subjects` | Student's eligible subjects (names + stats only) | 5 min |
| `GET /api/subject/[id]` | Full chapter/topic tree for ONE subject + progress | 2 min |
| `POST /api/progress` | Toggle topic completion | No cache |
| `POST /api/pacing` | Update pacing goal | No cache |
| `GET /api/sync` | Trigger sheet → DB sync | No cache |
| `POST /api/revalidate` | Webhook for cache invalidation | No cache |

**Key Changes:**
1. Split `/api/data` into smaller, focused endpoints
2. Client fetches subjects list first, then loads detail on demand
3. Curriculum data (subjects/chapters/topics) gets long cache since it rarely changes
4. Progress data gets short cache since students toggle it frequently

---

### Phase 4: Client-Side Optimization 📱

**Goal**: Fast app that works offline and feels instant.

**Zustand Store Strategy:**
```
┌─────────────────────────────────────┐
│          Zustand Store              │
│                                     │
│  serverData: {                      │
│    student: {...},      ← /api/me   │
│    subjects: [...],     ← /api/subj │
│    activeSubject: {...},← /api/subj │
│    progress: Set<string>            │
│  }                                  │
│                                     │
│  Persisted to localStorage:         │
│  - student profile                  │
│  - progress set (completed topics)  │
│  - active pacing goal               │
│  - last sync timestamp              │
└─────────────────────────────────────┘
```

**Offline Strategy:**
1. On login → fetch all data → store in Zustand + localStorage
2. On topic toggle → optimistic UI update → POST to API → fallback to queue if offline
3. On reconnect → sync queued progress writes → fetch fresh data
4. Curriculum data is cached aggressively (rarely changes)
5. Progress data is synced on every app open

**Service Worker Caching:**
- Cache-first: Static assets, icons, fonts
- Stale-while-revalidate: Curriculum data (subjects, chapters, topics)
- Network-first: Progress writes, login, sync

---

## Cost Analysis: $0.00/month 💰

| Component | Service | Cost |
|-----------|---------|------|
| Frontend + API | Vercel (Hobby) | Free |
| Database | Turso (Starter) | Free |
| CMS (curriculum) | Google Sheets | Free |
| Domain | vercel.app subdomain | Free |
| Auth | NextAuth.js (self-hosted) | Free |
| PWA Hosting | Vercel + Cloud | Free |
| **Total** | | **$0.00** |

---

## Migration Plan (What to Build & In What Order)

### Step 1: Clean up Google Sheet tabs
- Ensure column names match exactly what code expects
- Remove any merged cells or empty rows
- Set sharing to "Anyone with the link can view"

### Step 2: Build the smart sync engine
- Rewrite `sheet-sync.ts` with diff-based syncing
- Add row-level hash comparison
- Add webhook handler for instant sync on edit

### Step 3: Split the API endpoints
- Create `/api/me`, `/api/subjects` endpoints
- Refactor frontend to fetch on-demand instead of all-at-once

### Step 4: Optimize client store
- Better localStorage persistence
- Offline queue for progress writes
- Smarter cache invalidation

### Step 5: Add content management UX
- Admin can trigger sync from the app
- Show "last synced" timestamp
- Show "data updated" toast when webhook fires

---

## Data Ownership Matrix

| Data | Owner | Where Written | Where Read |
|------|-------|---------------|------------|
| Curriculum (subjects, chapters, topics) | **You** (in Google Sheets) | Google Sheets | App (via sync → DB) |
| User roster (who can access) | **You** (in Google Sheets) | Google Sheets | App (via sync → DB) |
| Student progress (completed topics) | **Student** (in app) | Turso DB | Turso DB |
| Pacing goals | **Student** (in app) | Turso DB | Turso DB |
| App config | **You** (in Google Sheets) | Google Sheets | App (via sync → DB) |

**Simple rule**: If YOU edit it → it lives in Google Sheets. If the STUDENT edits it → it lives in Turso DB.

---

## Security Considerations

1. **Google Sheet is public (view-only)** → Never put passwords, tokens, or sensitive data in it
2. **Student PINs** → Currently in the Users tab. Should be hashed, not plain text
3. **Progress data** → Not in Sheets, so student activity is private
4. **API routes** → Add rate limiting on login attempts
5. **Webhook secret** → `REVALIDATION_SECRET` prevents unauthorized cache invalidation

---

## Summary: Why This Strategy Works

| Concern | Solution |
|---------|----------|
| **Cost** | Everything is free tier. Google Sheets = free CMS, Turso = free DB, Vercel = free hosting |
| **Content updates** | Edit Google Sheets → changes propagate to app automatically via sync/webhook |
| **Performance** | Turso DB for fast reads, Sheets only for sync. Client-side caching for instant UI |
| **Offline** | Service worker + localStorage = works without internet |
| **Scalability** | Turso handles thousands of reads. Sheets only hit on sync (not per-request) |
| **Data integrity** | Sheets = source of truth for content. DB = source of truth for app state. Never the twain shall conflict. |
