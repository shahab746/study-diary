/**
 * Database layer for Lecture Diary.
 *
 * On Vercel (when LIBSQL_URL is set): Uses @libsql/client directly, bypassing
 * Prisma entirely. This avoids Prisma's "URL_INVALID: The URL 'undefined' is
 * not in a valid format" error that occurs because Prisma's Rust engine
 * independently resolves DATABASE_URL from process.env and fails on Vercel.
 *
 * Locally: Uses Prisma with local SQLite (fast, no network dependency).
 */

import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// ─── ID Generator (replaces Prisma's @default(cuid())) ────────────────────────

function generateId(): string {
  // Use a cuid-like format: 'c' + timestamp + random chars
  const timestamp = Date.now().toString(36)
  const random = randomUUID().replace(/-/g, '').substring(0, 17)
  return `cl${timestamp}${random}`
}

// ─── Date/Boolean Value Normalizer ────────────────────────────────────────────
// Converts JS values to formats SQLite/Turso understands

function normalizeValue(v: any): any {
  if (v instanceof Date) return v.toISOString()
  if (v === true) return 1
  if (v === false) return 0
  if (v === undefined || v === null) return null
  return v
}

function normalizeData(data: Record<string, any>): { cols: string[]; vals: any[] } {
  const entries = Object.entries(data).filter(([, v]) => v !== undefined)
  return {
    cols: entries.map(([k]) => quoteCol(k)),
    vals: entries.map(([, v]) => normalizeValue(v)),
  }
}

/** Quote a column name to avoid SQL reserved word conflicts (e.g. "order", "key") */
function quoteCol(name: string): string {
  return `"${name}"`
}

// ─── Turso Direct Client (used on Vercel) ────────────────────────────────────

let _tursoClient: any
let _tablesInitialized = false

const TURSO_SCHEMA = `
CREATE TABLE IF NOT EXISTS Student (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  grade INTEGER NOT NULL,
  board TEXT NOT NULL,
  field TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'paid',
  startDate DATETIME NOT NULL,
  targetDate DATETIME NOT NULL,
  currentDay INTEGER NOT NULL DEFAULT 1,
  totalDays INTEGER NOT NULL,
  topicsDone INTEGER NOT NULL DEFAULT 0,
  daysLeft INTEGER NOT NULL,
  pacingGoal TEXT NOT NULL DEFAULT '5M',
  pin TEXT NOT NULL DEFAULT '1234',
  academicGroup TEXT NOT NULL DEFAULT '',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Subject (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  board TEXT NOT NULL,
  field TEXT NOT NULL,
  totalTopics INTEGER NOT NULL,
  chapterCount INTEGER NOT NULL,
  color TEXT NOT NULL,
  icon TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  groupEligibility TEXT NOT NULL DEFAULT 'Both',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Chapter (
  id TEXT PRIMARY KEY NOT NULL,
  subjectId TEXT NOT NULL,
  number INTEGER NOT NULL,
  name TEXT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subjectId) REFERENCES Subject(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS Topic (
  id TEXT PRIMARY KEY NOT NULL,
  chapterId TEXT NOT NULL,
  number INTEGER NOT NULL,
  name TEXT NOT NULL,
  videoLink TEXT NOT NULL DEFAULT '',
  pdfLink TEXT NOT NULL DEFAULT '',
  isFree BOOLEAN NOT NULL DEFAULT true,
  dayNumber INTEGER NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (chapterId) REFERENCES Chapter(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS Progress (
  id TEXT PRIMARY KEY NOT NULL,
  topicId TEXT NOT NULL,
  studentPhone TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  dateCompleted DATETIME,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (topicId) REFERENCES Topic(id) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE(topicId, studentPhone)
);

CREATE TABLE IF NOT EXISTS SpecialCourse (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  videoLink TEXT NOT NULL DEFAULT '',
  pdfLink TEXT NOT NULL DEFAULT '',
  grade TEXT NOT NULL,
  board TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Config (
  id TEXT PRIMARY KEY NOT NULL,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS Chapter_subjectId_idx ON Chapter(subjectId);
CREATE INDEX IF NOT EXISTS Topic_chapterId_idx ON Topic(chapterId);
CREATE INDEX IF NOT EXISTS Progress_topicId_idx ON Progress(topicId);
CREATE INDEX IF NOT EXISTS Progress_studentPhone_idx ON Progress(studentPhone);
`

async function ensureTablesExist(client: any) {
  if (_tablesInitialized) return
  try {
    const result = await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='Student'")
    if (result.rows.length === 0) {
      console.log('📦 DB: Tables not found in Turso, creating them one by one...')
      const statements = TURSO_SCHEMA.split(';').map((s: string) => s.trim()).filter((s: string) => s.length > 0)
      for (const stmt of statements) {
        try {
          await client.execute(stmt)
        } catch (stmtErr: any) {
          if (stmtErr?.message?.includes('already exists')) {
            console.log(`📦 DB: Table already exists, skipping: ${stmt.substring(0, 50)}...`)
          } else {
            console.error(`📦 DB: Failed to execute: ${stmt.substring(0, 80)}...`, stmtErr?.message)
            throw stmtErr
          }
        }
      }
      console.log('📦 DB: Tables created successfully in Turso')
    } else {
      console.log('📦 DB: Tables already exist in Turso')
    }
    _tablesInitialized = true
  } catch (err) {
    console.error('📦 DB: CRITICAL - Failed to initialize tables:', err)
    _tablesInitialized = false
    throw new Error(`Database table initialization failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}

function getTursoClient() {
  if (!_tursoClient) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@libsql/client') as typeof import('@libsql/client')
    const url = process.env.LIBSQL_URL
    const authToken = process.env.LIBSQL_AUTH_TOKEN

    if (!url) throw new Error('LIBSQL_URL environment variable is not set')
    console.log(`📦 DB: Creating LibSQL client for ${url}`)

    if (!authToken) {
      console.warn('📦 DB: WARNING - No LIBSQL_AUTH_TOKEN set.')
    }

    _tursoClient = createClient({ url, authToken: authToken || undefined })
  }
  return _tursoClient
}

// ─── Prisma Client (used locally) ────────────────────────────────────────────

let _prismaClient: PrismaClient | undefined

function getPrismaClient(): PrismaClient {
  if (!_prismaClient) {
    _prismaClient = globalForPrisma.prisma ?? new PrismaClient()
    if (process.env.NODE_ENV === 'production') globalForPrisma.prisma = _prismaClient
  }
  return _prismaClient
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isTurso = () => !!process.env.LIBSQL_URL

/** Map DB row to camelCase */
function toCamelCase(row: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    result[camelKey] = value
  }
  return result
}

/** Ensure data has an 'id' field (auto-generates if missing, like Prisma's @default(cuid())) */
function ensureId(data: Record<string, any>): Record<string, any> {
  if (!data.id) {
    return { ...data, id: generateId() }
  }
  return data
}

// ─── Turso Query Builder ─────────────────────────────────────────────────────

async function tursoQuery(model: string, method: string, args: any[]): Promise<any> {
  const turso = getTursoClient()
  await ensureTablesExist(turso)

  // ─── STUDENT ─────────────────────────────────────────────────────────
  if (model === 'student') {
    if (method === 'findUnique' || method === 'findFirst') {
      const where = args[0]?.where || {}
      const select = args[0]?.select
      let sql = 'SELECT * FROM Student'
      const sqlArgs: any[] = []
      if (where.phone) { sql += ' WHERE phone = ?'; sqlArgs.push(where.phone) }
      else if (where.id) { sql += ' WHERE id = ?'; sqlArgs.push(where.id) }
      sql += ' LIMIT 1'
      const result = await turso.execute({ sql, args: sqlArgs })
      if (!result.rows[0]) return null
      const student = toCamelCase(result.rows[0] as Record<string, any>)
      if (select) {
        const filtered: Record<string, any> = {}
        for (const key of Object.keys(select)) {
          if (select[key]) filtered[key] = student[key]
        }
        return filtered
      }
      return student
    }
    if (method === 'findMany') {
      const where = args[0]?.where
      const orderBy = args[0]?.orderBy
      let sql = 'SELECT * FROM Student'
      const sqlArgs: any[] = []
      if (where?.status) { sql += ' WHERE status = ?'; sqlArgs.push(where.status) }
      if (orderBy) {
        const field = Object.keys(orderBy)[0]
        const dir = orderBy[field] === 'desc' ? 'DESC' : 'ASC'
        sql += ` ORDER BY ${quoteCol(field)} ${dir}`
      }
      const result = await turso.execute({ sql, args: sqlArgs })
      return result.rows.map((r: any) => toCamelCase(r as Record<string, any>))
    }
    if (method === 'count') {
      const result = await turso.execute('SELECT COUNT(*) as count FROM Student')
      return Number((result.rows[0] as any)?.count ?? 0)
    }
    if (method === 'upsert') {
      const { where, create, update } = args[0]
      const existing = await turso.execute({
        sql: 'SELECT id FROM Student WHERE phone = ?',
        args: [where.phone],
      })
      if (existing.rows.length > 0) {
        const { cols, vals } = normalizeData(update as Record<string, any>)
        const setClauses = cols.map(c => `${c} = ?`)
        vals.push(where.phone)
        await turso.execute({ sql: `UPDATE Student SET ${setClauses.join(', ')} WHERE phone = ?`, args: vals })
      } else {
        const data = ensureId(create as Record<string, any>)
        const { cols, vals } = normalizeData(data)
        await turso.execute({ sql: `INSERT INTO Student (${cols.join(', ')}) VALUES (${vals.map(() => '?').join(', ')})`, args: vals })
      }
      const result = await turso.execute({ sql: 'SELECT * FROM Student WHERE phone = ?', args: [where.phone] })
      return result.rows[0] ? toCamelCase(result.rows[0] as Record<string, any>) : null
    }
    if (method === 'create') {
      const data = ensureId(args[0]?.data as Record<string, any>)
      const { cols, vals } = normalizeData(data)
      await turso.execute({ sql: `INSERT INTO Student (${cols.join(', ')}) VALUES (${vals.map(() => '?').join(', ')})`, args: vals })
      const phone = data.phone
      if (phone) {
        const result = await turso.execute({ sql: 'SELECT * FROM Student WHERE phone = ?', args: [phone] })
        return result.rows[0] ? toCamelCase(result.rows[0] as Record<string, any>) : null
      }
      return null
    }
    if (method === 'update') {
      const { where, data } = args[0]
      const { cols, vals } = normalizeData(data as Record<string, any>)
      const setClauses = cols.map(c => `${c} = ?`)
      const whereKey = where.phone ? 'phone' : 'id'
      vals.push(where[whereKey])
      await turso.execute({ sql: `UPDATE Student SET ${setClauses.join(', ')} WHERE ${whereKey} = ?`, args: vals })
      const result = await turso.execute({ sql: `SELECT * FROM Student WHERE ${whereKey} = ?`, args: [where[whereKey]] })
      return result.rows[0] ? toCamelCase(result.rows[0] as Record<string, any>) : null
    }
  }

  // ─── SUBJECT ─────────────────────────────────────────────────────────
  if (model === 'subject') {
    if (method === 'findUnique') {
      const where = args[0]?.where
      const include = args[0]?.include
      if (!where?.id) return null
      const result = await turso.execute({ sql: 'SELECT * FROM Subject WHERE id = ?', args: [where.id] })
      if (!result.rows[0]) return null
      const subject = toCamelCase(result.rows[0] as Record<string, any>)
      if (include?.chapters) {
        const chaptersResult = await turso.execute({ sql: 'SELECT * FROM Chapter WHERE subjectId = ? ORDER BY number ASC', args: [where.id] })
        subject.chapters = []
        for (const ch of chaptersResult.rows) {
          const chapter = toCamelCase(ch as Record<string, any>)
          if (include.chapters?.include?.topics || (args[0]?.select?.chapters as any)?.select?.topics) {
            const topicsResult = await turso.execute({ sql: 'SELECT * FROM Topic WHERE chapterId = ? ORDER BY number ASC', args: [(ch as any).id] })
            chapter.topics = topicsResult.rows.map((t: any) => {
              const topic = toCamelCase(t as Record<string, any>)
              const topicSelect = (args[0]?.select?.chapters as any)?.select?.topics
              if (topicSelect?.select?.progress || (args[0]?.select?.chapters as any)?.select?.topics?.include?.progress) {
                topic.progress = []
              }
              return topic
            })
          }
          subject.chapters.push(chapter)
        }
      }
      return subject
    }
    if (method === 'findFirst') {
      const where = args[0]?.where
      const include = args[0]?.include
      let sql = 'SELECT * FROM Subject'
      const sqlArgs: any[] = []
      const conditions: string[] = []
      if (where) {
        if (where.grade) {
          if (where.grade?.in) {
            conditions.push(`${quoteCol('grade')} IN (${where.grade.in.map(() => '?').join(', ')})`)
            sqlArgs.push(...where.grade.in)
          } else {
            conditions.push(`${quoteCol('grade')} = ?`); sqlArgs.push(where.grade)
          }
        }
        if (where.board) {
          if (where.board?.in) {
            conditions.push(`${quoteCol('board')} IN (${where.board.in.map(() => '?').join(', ')})`)
            sqlArgs.push(...where.board.in)
          } else {
            conditions.push(`${quoteCol('board')} = ?`); sqlArgs.push(where.board)
          }
        }
        if (where.name) {
          if (where.name?.in) {
            conditions.push(`${quoteCol('name')} IN (${where.name.in.map(() => '?').join(', ')})`)
            sqlArgs.push(...where.name.in)
          } else {
            conditions.push(`${quoteCol('name')} = ?`); sqlArgs.push(where.name)
          }
        }
        if (where.field) {
          if (where.field?.in) {
            conditions.push(`${quoteCol('field')} IN (${where.field.in.map(() => '?').join(', ')})`)
            sqlArgs.push(...where.field.in)
          } else {
            conditions.push(`${quoteCol('field')} = ?`); sqlArgs.push(where.field)
          }
        }
        if (where.AND) {
          for (const cond of (where.AND as any[])) {
            for (const [key, val] of Object.entries(cond)) {
              if (val && typeof val === 'object' && (val as any).in) {
                conditions.push(`${quoteCol(key)} IN (${(val as any).in.map(() => '?').join(', ')})`)
                sqlArgs.push(...(val as any).in)
              } else {
                conditions.push(`${quoteCol(key)} = ?`)
                sqlArgs.push(val)
              }
            }
          }
        }
      }
      if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ')
      sql += ' LIMIT 1'
      const result = await turso.execute({ sql, args: sqlArgs })
      if (!result.rows[0]) return null
      const subject = toCamelCase(result.rows[0] as Record<string, any>)
      if (include?.chapters) {
        const chaptersResult = await turso.execute({ sql: 'SELECT * FROM Chapter WHERE subjectId = ? ORDER BY number ASC', args: [subject.id] })
        subject.chapters = []
        for (const ch of chaptersResult.rows) {
          const chapter = toCamelCase(ch as Record<string, any>)
          if (include.chapters === true || include.chapters?.include?.topics) {
            const topicsResult = await turso.execute({ sql: 'SELECT * FROM Topic WHERE chapterId = ? ORDER BY number ASC', args: [(ch as any).id] })
            chapter.topics = topicsResult.rows.map((t: any) => toCamelCase(t as Record<string, any>))
          }
          subject.chapters.push(chapter)
        }
      }
      return subject
    }
    if (method === 'findMany') {
      const where = args[0]?.where
      const orderBy = args[0]?.orderBy
      const include = args[0]?.include
      let sql = 'SELECT * FROM Subject'
      const sqlArgs: any[] = []
      const conditions: string[] = []
      if (where) {
        if (where.grade) {
          if (where.grade?.in) {
            conditions.push(`${quoteCol('grade')} IN (${where.grade.in.map(() => '?').join(', ')})`)
            sqlArgs.push(...where.grade.in)
          } else {
            conditions.push(`${quoteCol('grade')} = ?`); sqlArgs.push(where.grade)
          }
        }
        if (where.board) {
          if (where.board?.in) {
            conditions.push(`${quoteCol('board')} IN (${where.board.in.map(() => '?').join(', ')})`)
            sqlArgs.push(...where.board.in)
          } else {
            conditions.push(`${quoteCol('board')} = ?`); sqlArgs.push(where.board)
          }
        }
        if (where.field) {
          if (where.field?.in) {
            conditions.push(`${quoteCol('field')} IN (${where.field.in.map(() => '?').join(', ')})`)
            sqlArgs.push(...where.field.in)
          } else {
            conditions.push(`${quoteCol('field')} = ?`); sqlArgs.push(where.field)
          }
        }
        if (where.name) {
          if (where.name?.in) {
            conditions.push(`${quoteCol('name')} IN (${where.name.in.map(() => '?').join(', ')})`)
            sqlArgs.push(...where.name.in)
          } else {
            conditions.push(`${quoteCol('name')} = ?`); sqlArgs.push(where.name)
          }
        }
        if (where.AND) {
          for (const cond of (where.AND as any[])) {
            for (const [key, val] of Object.entries(cond)) {
              if (val && typeof val === 'object' && (val as any).in) {
                conditions.push(`${quoteCol(key)} IN (${(val as any).in.map(() => '?').join(', ')})`)
                sqlArgs.push(...(val as any).in)
              } else {
                conditions.push(`${quoteCol(key)} = ?`)
                sqlArgs.push(val)
              }
            }
          }
        }
      }
      if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ')
      if (orderBy) {
        const field = Object.keys(orderBy)[0]
        const dir = orderBy[field] === 'desc' ? 'DESC' : 'ASC'
        sql += ` ORDER BY ${quoteCol(field)} ${dir}`
      } else {
        sql += ' ORDER BY `order` ASC'
      }
      const result = await turso.execute({ sql, args: sqlArgs })
      const subjects = result.rows.map((r: any) => toCamelCase(r as Record<string, any>))

      if (include?.chapters) {
        for (const subject of subjects) {
          const chResult = await turso.execute({ sql: 'SELECT * FROM Chapter WHERE subjectId = ? ORDER BY number ASC', args: [subject.id] })
          subject.chapters = chResult.rows.map((ch: any) => toCamelCase(ch as Record<string, any>))
          if (include.chapters === true || include.chapters?.include?.topics) {
            for (const chapter of subject.chapters) {
              const tResult = await turso.execute({ sql: 'SELECT * FROM Topic WHERE chapterId = ? ORDER BY number ASC', args: [chapter.id] })
              chapter.topics = tResult.rows.map((t: any) => toCamelCase(t as Record<string, any>))
              if (include.chapters?.include?.topics?.include?.progress) {
                for (const topic of chapter.topics) {
                  const pResult = await turso.execute({ sql: 'SELECT * FROM Progress WHERE topicId = ?', args: [topic.id] })
                  topic.progress = pResult.rows.map((p: any) => toCamelCase(p as Record<string, any>))
                }
              }
            }
          }
        }
      }
      return subjects
    }
    if (method === 'count') {
      const result = await turso.execute('SELECT COUNT(*) as count FROM Subject')
      return Number((result.rows[0] as any)?.count ?? 0)
    }
    if (method === 'create') {
      const data = ensureId(args[0]?.data as Record<string, any>)
      const include = args[0]?.include
      const { cols, vals } = normalizeData(data)
      await turso.execute({ sql: `INSERT INTO Subject (${cols.join(', ')}) VALUES (${vals.map(() => '?').join(', ')})`, args: vals })
      const result = await turso.execute('SELECT * FROM Subject ORDER BY createdAt DESC LIMIT 1')
      const subject = result.rows[0] ? toCamelCase(result.rows[0] as Record<string, any>) : null
      if (subject && include?.chapters) {
        const chResult = await turso.execute({ sql: 'SELECT * FROM Chapter WHERE subjectId = ? ORDER BY number ASC', args: [subject.id] })
        subject.chapters = chResult.rows.map((ch: any) => {
          const chapter = toCamelCase(ch as Record<string, any>)
          if (include.chapters?.include?.topics) {
            chapter.topics = []
          }
          return chapter
        })
      }
      return subject
    }
    if (method === 'update') {
      const { where, data } = args[0]
      const { cols, vals } = normalizeData(data as Record<string, any>)
      const setClauses = cols.map(c => `${c} = ?`)
      vals.push(where.id)
      await turso.execute({ sql: `UPDATE Subject SET ${setClauses.join(', ')} WHERE id = ?`, args: vals })
      const result = await turso.execute({ sql: 'SELECT * FROM Subject WHERE id = ?', args: [where.id] })
      return result.rows[0] ? toCamelCase(result.rows[0] as Record<string, any>) : null
    }
    if (method === 'delete') {
      const where = args[0]?.where
      if (where?.id) await turso.execute({ sql: 'DELETE FROM Subject WHERE id = ?', args: [where.id] })
      return null
    }
  }

  // ─── CHAPTER ─────────────────────────────────────────────────────────
  if (model === 'chapter') {
    if (method === 'create') {
      const data = ensureId(args[0]?.data as Record<string, any>)
      const include = args[0]?.include
      const { cols, vals } = normalizeData(data)
      await turso.execute({ sql: `INSERT INTO Chapter (${cols.join(', ')}) VALUES (${vals.map(() => '?').join(', ')})`, args: vals })
      const result = await turso.execute('SELECT * FROM Chapter ORDER BY createdAt DESC LIMIT 1')
      const chapter = result.rows[0] ? toCamelCase(result.rows[0] as Record<string, any>) : null
      if (chapter && include?.topics) {
        chapter.topics = []
      }
      return chapter
    }
    if (method === 'update') {
      const { where, data } = args[0]
      const { cols, vals } = normalizeData(data as Record<string, any>)
      const setClauses = cols.map(c => `${c} = ?`)
      vals.push(where.id)
      await turso.execute({ sql: `UPDATE Chapter SET ${setClauses.join(', ')} WHERE id = ?`, args: vals })
      return null
    }
    if (method === 'delete') {
      const where = args[0]?.where
      if (where?.id) await turso.execute({ sql: 'DELETE FROM Chapter WHERE id = ?', args: [where.id] })
      return null
    }
    if (method === 'findMany') {
      const where = args[0]?.where
      const include = args[0]?.include
      let sql = 'SELECT * FROM Chapter'
      const sqlArgs: any[] = []
      if (where?.subjectId) { sql += ' WHERE subjectId = ?'; sqlArgs.push(where.subjectId) }
      sql += ' ORDER BY number ASC'
      const result = await turso.execute({ sql, args: sqlArgs })
      const chapters = result.rows.map((r: any) => toCamelCase(r as Record<string, any>))
      if (include?.topics) {
        for (const chapter of chapters) {
          const tResult = await turso.execute({ sql: 'SELECT * FROM Topic WHERE chapterId = ? ORDER BY number ASC', args: [chapter.id] })
          chapter.topics = tResult.rows.map((t: any) => toCamelCase(t as Record<string, any>))
        }
      }
      if (include?.subject) {
        for (const chapter of chapters) {
          const sResult = await turso.execute({ sql: 'SELECT * FROM Subject WHERE id = ?', args: [chapter.subjectId] })
          chapter.subject = sResult.rows[0] ? toCamelCase(sResult.rows[0] as Record<string, any>) : null
        }
      }
      return chapters
    }
  }

  // ─── TOPIC ───────────────────────────────────────────────────────────
  if (model === 'topic') {
    if (method === 'findUnique') {
      const where = args[0]?.where
      if (!where?.id) return null
      const result = await turso.execute({ sql: 'SELECT * FROM Topic WHERE id = ?', args: [where.id] })
      return result.rows[0] ? toCamelCase(result.rows[0] as Record<string, any>) : null
    }
    if (method === 'findMany') {
      const where = args[0]?.where
      const include = args[0]?.include
      let sql = 'SELECT * FROM Topic'
      const sqlArgs: any[] = []
      if (where?.chapterId) { sql += ' WHERE chapterId = ?'; sqlArgs.push(where.chapterId) }
      sql += ' ORDER BY number ASC'
      const result = await turso.execute({ sql, args: sqlArgs })
      const topics = result.rows.map((r: any) => toCamelCase(r as Record<string, any>))
      if (include?.chapter) {
        for (const topic of topics) {
          const chResult = await turso.execute({ sql: 'SELECT * FROM Chapter WHERE id = ?', args: [topic.chapterId] })
          topic.chapter = chResult.rows[0] ? toCamelCase(chResult.rows[0] as Record<string, any>) : null
        }
      }
      return topics
    }
    if (method === 'count') {
      const result = await turso.execute('SELECT COUNT(*) as count FROM Topic')
      return Number((result.rows[0] as any)?.count ?? 0)
    }
    if (method === 'create') {
      const data = ensureId(args[0]?.data as Record<string, any>)
      const { cols, vals } = normalizeData(data)
      await turso.execute({ sql: `INSERT INTO Topic (${cols.join(', ')}) VALUES (${vals.map(() => '?').join(', ')})`, args: vals })
      const result = await turso.execute('SELECT * FROM Topic ORDER BY createdAt DESC LIMIT 1')
      return result.rows[0] ? toCamelCase(result.rows[0] as Record<string, any>) : null
    }
    if (method === 'update') {
      const { where, data } = args[0]
      const { cols, vals } = normalizeData(data as Record<string, any>)
      const setClauses = cols.map(c => `${c} = ?`)
      vals.push(where.id)
      await turso.execute({ sql: `UPDATE Topic SET ${setClauses.join(', ')} WHERE id = ?`, args: vals })
      return null
    }
    if (method === 'delete') {
      const where = args[0]?.where
      if (where?.id) await turso.execute({ sql: 'DELETE FROM Topic WHERE id = ?', args: [where.id] })
      return null
    }
  }

  // ─── PROGRESS ────────────────────────────────────────────────────────
  if (model === 'progress') {
    if (method === 'findUnique') {
      const where = args[0]?.where
      if (where?.topicId_studentPhone) {
        const result = await turso.execute({
          sql: 'SELECT * FROM Progress WHERE topicId = ? AND studentPhone = ?',
          args: [where.topicId_studentPhone.topicId, where.topicId_studentPhone.studentPhone],
        })
        return result.rows[0] ? toCamelCase(result.rows[0] as Record<string, any>) : null
      }
      return null
    }
    if (method === 'findFirst') {
      const where = args[0]?.where || {}
      let sql = 'SELECT * FROM Progress'
      const sqlArgs: any[] = []
      const conditions: string[] = []
      if (where.topicId) {
        if (where.topicId?.in) {
          conditions.push(`topicId IN (${where.topicId.in.map(() => '?').join(', ')})`)
          sqlArgs.push(...where.topicId.in)
        } else {
          conditions.push('topicId = ?'); sqlArgs.push(where.topicId)
        }
      }
      if (where.studentPhone) { conditions.push('studentPhone = ?'); sqlArgs.push(where.studentPhone) }
      if (where.completed !== undefined) { conditions.push('completed = ?'); sqlArgs.push(where.completed ? 1 : 0) }
      if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ')
      sql += ' LIMIT 1'
      const result = await turso.execute({ sql, args: sqlArgs })
      return result.rows[0] ? toCamelCase(result.rows[0] as Record<string, any>) : null
    }
    if (method === 'findMany') {
      const where = args[0]?.where || {}
      let sql = 'SELECT * FROM Progress'
      const sqlArgs: any[] = []
      const conditions: string[] = []
      if (where.studentPhone) { conditions.push('studentPhone = ?'); sqlArgs.push(where.studentPhone) }
      if (where.topicId) { conditions.push('topicId = ?'); sqlArgs.push(where.topicId) }
      if (where.completed !== undefined) { conditions.push('completed = ?'); sqlArgs.push(where.completed ? 1 : 0) }
      if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ')
      const result = await turso.execute({ sql, args: sqlArgs })
      return result.rows.map((r: any) => toCamelCase(r as Record<string, any>))
    }
    if (method === 'count') {
      const where = args[0]?.where
      let sql = 'SELECT COUNT(*) as count FROM Progress'
      const sqlArgs: any[] = []
      if (where?.studentPhone) { sql += ' WHERE studentPhone = ?'; sqlArgs.push(where.studentPhone) }
      const result = await turso.execute({ sql, args: sqlArgs })
      return Number((result.rows[0] as any)?.count ?? 0)
    }
    if (method === 'upsert') {
      const { where, create, update } = args[0]
      let existingResult: any
      if (where.topicId_studentPhone) {
        existingResult = await turso.execute({
          sql: 'SELECT id FROM Progress WHERE topicId = ? AND studentPhone = ?',
          args: [where.topicId_studentPhone.topicId, where.topicId_studentPhone.studentPhone],
        })
      }
      if (existingResult && existingResult.rows.length > 0) {
        const { cols, vals } = normalizeData(update as Record<string, any>)
        const setClauses = cols.map(c => `${c} = ?`)
        vals.push((existingResult.rows[0] as any).id)
        await turso.execute({ sql: `UPDATE Progress SET ${setClauses.join(', ')} WHERE id = ?`, args: vals })
      } else {
        const data = ensureId(create as Record<string, any>)
        const { cols, vals } = normalizeData(data)
        await turso.execute({ sql: `INSERT INTO Progress (${cols.join(', ')}) VALUES (${vals.map(() => '?').join(', ')})`, args: vals })
      }
      const lookupTopicId = (create as any)?.topicId || (where as any)?.topicId_studentPhone?.topicId
      const lookupPhone = (create as any)?.studentPhone || (where as any)?.topicId_studentPhone?.studentPhone
      if (lookupTopicId && lookupPhone) {
        const result = await turso.execute({
          sql: 'SELECT * FROM Progress WHERE topicId = ? AND studentPhone = ?',
          args: [lookupTopicId, lookupPhone],
        })
        return result.rows[0] ? toCamelCase(result.rows[0] as Record<string, any>) : null
      }
      return null
    }
    if (method === 'create') {
      const data = ensureId(args[0]?.data as Record<string, any>)
      const { cols, vals } = normalizeData(data)
      await turso.execute({ sql: `INSERT INTO Progress (${cols.join(', ')}) VALUES (${vals.map(() => '?').join(', ')})`, args: vals })
      if (data.topicId && data.studentPhone) {
        const result = await turso.execute({
          sql: 'SELECT * FROM Progress WHERE topicId = ? AND studentPhone = ?',
          args: [data.topicId, data.studentPhone],
        })
        return result.rows[0] ? toCamelCase(result.rows[0] as Record<string, any>) : null
      }
      return null
    }
    if (method === 'delete') {
      const where = args[0]?.where
      if (where?.topicId_studentPhone) {
        await turso.execute({
          sql: 'DELETE FROM Progress WHERE topicId = ? AND studentPhone = ?',
          args: [where.topicId_studentPhone.topicId, where.topicId_studentPhone.studentPhone],
        })
      } else if (where?.id) {
        await turso.execute({ sql: 'DELETE FROM Progress WHERE id = ?', args: [where.id] })
      }
      return null
    }
    if (method === 'deleteMany') {
      const where = args[0]?.where
      if (where?.studentPhone) {
        await turso.execute({ sql: 'DELETE FROM Progress WHERE studentPhone = ?', args: [where.studentPhone] })
      }
      return { count: 0 }
    }
  }

  // ─── SPECIAL COURSE ──────────────────────────────────────────────────
  if (model === 'specialCourse') {
    if (method === 'findMany') {
      const where = args[0]?.where
      let sql = 'SELECT * FROM SpecialCourse'
      const sqlArgs: any[] = []
      const conditions: string[] = []
      if (where) {
        if (where.grade) {
          if (where.grade?.in) {
            conditions.push(`${quoteCol('grade')} IN (${where.grade.in.map(() => '?').join(', ')})`)
            sqlArgs.push(...where.grade.in)
          } else {
            conditions.push(`${quoteCol('grade')} = ?`); sqlArgs.push(where.grade)
          }
        }
        if (where.board) {
          if (where.board?.in) {
            conditions.push(`${quoteCol('board')} IN (${where.board.in.map(() => '?').join(', ')})`)
            sqlArgs.push(...where.board.in)
          } else {
            conditions.push(`${quoteCol('board')} = ?`); sqlArgs.push(where.board)
          }
        }
      }
      if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ')
      sql += ' ORDER BY `order` ASC'
      const result = await turso.execute({ sql, args: sqlArgs })
      return result.rows.map((r: any) => toCamelCase(r as Record<string, any>))
    }
  }

  // ─── CONFIG ──────────────────────────────────────────────────────────
  if (model === 'config') {
    if (method === 'findUnique') {
      const where = args[0]?.where
      if (where?.key) {
        const result = await turso.execute({ sql: 'SELECT * FROM Config WHERE `key` = ?', args: [where.key] })
        return result.rows[0] ? toCamelCase(result.rows[0] as Record<string, any>) : null
      }
      return null
    }
    if (method === 'upsert') {
      const { where, create, update } = args[0]
      const existing = await turso.execute({ sql: 'SELECT id FROM Config WHERE `key` = ?', args: [where.key] })
      if (existing.rows.length > 0) {
        const { cols, vals } = normalizeData(update as Record<string, any>)
        const setClauses = cols.map(c => `${c} = ?`)
        vals.push(where.key)
        await turso.execute({ sql: `UPDATE Config SET ${setClauses.join(', ')} WHERE \`key\` = ?`, args: vals })
      } else {
        const data = ensureId(create as Record<string, any>)
        const { cols, vals } = normalizeData(data)
        await turso.execute({ sql: `INSERT INTO Config (${cols.join(', ')}) VALUES (${vals.map(() => '?').join(', ')})`, args: vals })
      }
      const result = await turso.execute({ sql: 'SELECT * FROM Config WHERE `key` = ?', args: [where.key] })
      return result.rows[0] ? toCamelCase(result.rows[0] as Record<string, any>) : null
    }
  }

  // ─── Fallback ────────────────────────────────────────────────────────
  console.warn(`📦 DB: Turso handler not implemented for ${model}.${method}`)
  throw new Error(`DB method ${model}.${method} not implemented for Turso. Please add it to db.ts.`)
}

// ─── Exported DB Object ──────────────────────────────────────────────────────

export const db = new Proxy({} as any, {
  get(_target, model) {
    return new Proxy({} as any, {
      get(_target, method) {
        return async (...args: any[]) => {
          if (isTurso()) {
            try {
              return await tursoQuery(String(model), String(method), args)
            } catch (error) {
              console.error(`📦 DB: Turso query error for ${String(model)}.${String(method)}:`, error)
              throw error
            }
          } else {
            const prisma = getPrismaClient()
            const modelClient = (prisma as any)[model]
            if (!modelClient) throw new Error(`Prisma model "${String(model)}" not found`)
            return modelClient[String(method)](...args)
          }
        }
      },
    })
  },
})

// Export getDb for backward compatibility
export function getDb(): any {
  return db
}
