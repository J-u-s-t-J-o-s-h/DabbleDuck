import { DatabaseSync, type StatementSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'
import type { ArtifactMeta } from '../../src/shared/hubContract'
import type { ChildProgress, Profile } from '../../src/shared/dataModel'

// ===========================================================================
// SQLite metadata store.
//
// Uses Node's built-in `node:sqlite` (DatabaseSync) so the Hub needs NO native
// compilation and NO extra dependency -- it runs on any machine with a modern
// Node, which is the most reliable option for "Josh's PC" class hardware.
//
// SQLite holds METADATA ONLY. Artifact bytes live on the filesystem.
//
// Phase 1 merge policy is deliberately simple: last-write-wins by updated_at.
// The `change_log` table is the seam for future cursor-based incremental sync.
// ===========================================================================

/**
 * Thin adapter over node:sqlite's DatabaseSync that exposes the small surface
 * the rest of the Hub uses (prepare/exec/transaction/close). Keeping this
 * boundary means we could swap the SQLite driver later without touching routes.
 */
export class HubDb {
  private readonly raw: DatabaseSync

  constructor(file: string) {
    this.raw = new DatabaseSync(file)
  }

  exec(sql: string): void {
    this.raw.exec(sql)
  }

  prepare(sql: string): StatementSync {
    return this.raw.prepare(sql)
  }

  /** Run `fn` inside a transaction, rolling back on any error. */
  transaction(fn: () => void): () => void {
    return () => {
      this.raw.exec('BEGIN')
      try {
        fn()
        this.raw.exec('COMMIT')
      } catch (err) {
        this.raw.exec('ROLLBACK')
        throw err
      }
    }
  }

  close(): void {
    this.raw.close()
  }
}

export function openDb(dbFile: string): HubDb {
  const db = new HubDb(dbFile)
  db.exec('PRAGMA journal_mode = WAL;')
  db.exec('PRAGMA foreign_keys = ON;')
  migrate(db)
  return db
}

function migrate(db: HubDb): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS devices (
      id        TEXT PRIMARY KEY,
      name      TEXT NOT NULL,
      token     TEXT NOT NULL,
      paired_at TEXT NOT NULL,
      last_seen TEXT
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      json          TEXT NOT NULL,
      updated_at    TEXT NOT NULL,
      source_device TEXT
    );

    CREATE TABLE IF NOT EXISTS progress (
      profile_id    TEXT PRIMARY KEY,
      json          TEXT NOT NULL,
      updated_at    TEXT NOT NULL,
      source_device TEXT
    );

    CREATE TABLE IF NOT EXISTS artifacts (
      id           TEXT PRIMARY KEY,
      profile_id   TEXT NOT NULL,
      type         TEXT NOT NULL,
      title        TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      mime_type    TEXT NOT NULL,
      file_name    TEXT NOT NULL,
      size         INTEGER NOT NULL,
      created_at   TEXT NOT NULL,
      source       TEXT NOT NULL,
      deleted_at   TEXT
    );

    CREATE TABLE IF NOT EXISTS change_log (
      seq       INTEGER PRIMARY KEY AUTOINCREMENT,
      kind      TEXT NOT NULL,
      ref_id    TEXT,
      device_id TEXT,
      at        TEXT NOT NULL
    );
  `)
}

// --- Hub identity ----------------------------------------------------------

export function ensureHubId(db: HubDb): string {
  const row = db
    .prepare('SELECT value FROM meta WHERE key = ?')
    .get('hubId') as { value: string } | undefined
  if (row?.value) return row.value
  const hubId = randomUUID()
  db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run('hubId', hubId)
  return hubId
}

// --- Change log ------------------------------------------------------------

export function appendChange(
  db: HubDb,
  kind: string,
  refId: string | null,
  deviceId: string | null
): number {
  const info = db
    .prepare(
      'INSERT INTO change_log (kind, ref_id, device_id, at) VALUES (?, ?, ?, ?)'
    )
    .run(kind, refId, deviceId, new Date().toISOString())
  return Number(info.lastInsertRowid)
}

export function currentCursor(db: HubDb): number {
  const row = db
    .prepare('SELECT COALESCE(MAX(seq), 0) AS seq FROM change_log')
    .get() as { seq: number }
  return row.seq
}

// --- Devices ---------------------------------------------------------------

export interface DeviceRow {
  id: string
  name: string
  token: string
  paired_at: string
  last_seen: string | null
}

export function insertDevice(db: HubDb, name: string): DeviceRow {
  const device: DeviceRow = {
    id: randomUUID(),
    name,
    token: randomUUID().replace(/-/g, ''),
    paired_at: new Date().toISOString(),
    last_seen: null
  }
  db.prepare(
    'INSERT INTO devices (id, name, token, paired_at, last_seen) VALUES (?, ?, ?, ?, ?)'
  ).run(device.id, device.name, device.token, device.paired_at, device.last_seen)
  return device
}

export function getDeviceByToken(
  db: HubDb,
  token: string
): DeviceRow | undefined {
  return db.prepare('SELECT * FROM devices WHERE token = ?').get(token) as
    | DeviceRow
    | undefined
}

export function touchDevice(db: HubDb, deviceId: string): void {
  db.prepare('UPDATE devices SET last_seen = ? WHERE id = ?').run(
    new Date().toISOString(),
    deviceId
  )
}

// --- Profiles --------------------------------------------------------------

export function upsertProfile(
  db: HubDb,
  profile: Profile,
  updatedAt: string,
  sourceDevice: string | null
): void {
  // Last-write-wins by updated_at.
  const existing = db
    .prepare('SELECT updated_at FROM profiles WHERE id = ?')
    .get(profile.id) as { updated_at: string } | undefined
  if (existing && existing.updated_at > updatedAt) return
  db.prepare(
    `INSERT INTO profiles (id, name, json, updated_at, source_device)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       json = excluded.json,
       updated_at = excluded.updated_at,
       source_device = excluded.source_device`
  ).run(
    profile.id,
    profile.name,
    JSON.stringify(profile),
    updatedAt,
    sourceDevice
  )
}

export function listProfiles(db: HubDb): Profile[] {
  const rows = db
    .prepare('SELECT json FROM profiles ORDER BY name COLLATE NOCASE')
    .all() as Array<{ json: string }>
  return rows.map((r) => JSON.parse(r.json) as Profile)
}

// --- Progress --------------------------------------------------------------

export function upsertProgress(
  db: HubDb,
  progress: ChildProgress,
  sourceDevice: string | null
): void {
  const updatedAt = progress.updatedAt ?? new Date().toISOString()
  const existing = db
    .prepare('SELECT updated_at FROM progress WHERE profile_id = ?')
    .get(progress.profileId) as { updated_at: string } | undefined
  if (existing && existing.updated_at > updatedAt) return
  db.prepare(
    `INSERT INTO progress (profile_id, json, updated_at, source_device)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(profile_id) DO UPDATE SET
       json = excluded.json,
       updated_at = excluded.updated_at,
       source_device = excluded.source_device`
  ).run(
    progress.profileId,
    JSON.stringify(progress),
    updatedAt,
    sourceDevice
  )
}

// --- Artifacts -------------------------------------------------------------

function rowToArtifactMeta(row: ArtifactRow): ArtifactMeta {
  return {
    id: row.id,
    profileId: row.profile_id,
    type: row.type,
    title: row.title,
    contentHash: row.content_hash,
    mimeType: row.mime_type,
    fileName: row.file_name,
    size: row.size,
    createdAt: row.created_at,
    source: row.source,
    deletedAt: row.deleted_at
  }
}

interface ArtifactRow {
  id: string
  profile_id: string
  type: string
  title: string
  content_hash: string
  mime_type: string
  file_name: string
  size: number
  created_at: string
  source: string
  deleted_at: string | null
}

export function insertArtifact(db: HubDb, meta: ArtifactMeta): void {
  db.prepare(
    `INSERT INTO artifacts
       (id, profile_id, type, title, content_hash, mime_type, file_name, size, created_at, source, deleted_at)
     VALUES
       (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO NOTHING`
  ).run(
    meta.id,
    meta.profileId,
    meta.type,
    meta.title,
    meta.contentHash,
    meta.mimeType,
    meta.fileName,
    meta.size,
    meta.createdAt,
    meta.source,
    meta.deletedAt ?? null
  )
}

export function getArtifact(db: HubDb, id: string): ArtifactMeta | undefined {
  const row = db.prepare('SELECT * FROM artifacts WHERE id = ?').get(id) as
    | ArtifactRow
    | undefined
  return row ? rowToArtifactMeta(row) : undefined
}

export function listArtifacts(db: HubDb): ArtifactMeta[] {
  const rows = db
    .prepare(
      'SELECT * FROM artifacts WHERE deleted_at IS NULL ORDER BY created_at DESC'
    )
    .all() as unknown as ArtifactRow[]
  return rows.map(rowToArtifactMeta)
}
