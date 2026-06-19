import { join } from 'path'
import {
  CONTRACT_VERSION,
  EVENTS_FILE,
  LAUNCH_FILE,
  RESULT_FILE,
  type GameEvent,
  type GameManifest,
  type GameResult,
  type LaunchContext,
  type SettingsSnapshot
} from '../shared/gameContract'
import type { Profile } from '../renderer/types'

// ===========================================================================
// Game session helpers (pure — no Electron, no IO side effects).
//
// These build the launch context handed to a game and parse the artifacts a
// game writes back. Keeping them pure makes the whole handoff unit-testable
// outside of Electron (see tools/verify-slice.ts).
// ===========================================================================

/** Make a filesystem-safe token. */
function safe(token: string): string {
  return token.replace(/[^a-zA-Z0-9_-]/g, '-')
}

/** Build a unique, human-readable session id. */
export function makeSessionId(
  profileId: string,
  gameId: string,
  date: Date = new Date()
): string {
  const stamp = date.toISOString().replace(/[:.]/g, '-')
  return `${stamp}_${safe(profileId)}_${safe(gameId)}`
}

/** Absolute paths for the three contract files within a session folder. */
export function sessionPaths(sessionDir: string): {
  launch: string
  events: string
  result: string
} {
  return {
    launch: join(sessionDir, LAUNCH_FILE),
    events: join(sessionDir, EVENTS_FILE),
    result: join(sessionDir, RESULT_FILE)
  }
}

/** Assemble the read-only launch context for a game. */
export function buildLaunchContext(input: {
  sessionId: string
  manifest: GameManifest
  profile: Profile
  settings: SettingsSnapshot
  remainingSeconds: number
  moduleState: unknown
  startedAt?: string
}): LaunchContext {
  return {
    contractVersion: CONTRACT_VERSION,
    sessionId: input.sessionId,
    game: { id: input.manifest.id, version: input.manifest.version },
    profile: {
      id: input.profile.id,
      name: input.profile.name,
      age: input.profile.age,
      color: input.profile.color,
      icon: input.profile.icon
    },
    settings: input.settings,
    session: {
      remainingSeconds: input.remainingSeconds,
      startedAt: input.startedAt ?? new Date().toISOString()
    },
    moduleState: input.moduleState ?? null
  }
}

/**
 * Parse an append-only event log. Tolerant by design: blank lines and a
 * trailing partial line (e.g. from a crash mid-write) are skipped rather than
 * throwing, so partial progress is never lost.
 */
export function parseEvents(raw: string): GameEvent[] {
  const events: GameEvent[] = []
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      events.push(JSON.parse(trimmed) as GameEvent)
    } catch {
      // Ignore an unparsable (likely partially-written) line.
    }
  }
  return events
}

/** Parse result.json, returning null if missing or invalid. */
export function parseResult(raw: string | null): GameResult | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as GameResult
  } catch {
    return null
  }
}
