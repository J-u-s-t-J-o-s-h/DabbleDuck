// ===========================================================================
// DabbleDuck cross-process game contract (v1)
//
// This is the SINGLE source of truth for how the DabbleDuck launcher and a
// standalone game (Godot, or the placeholder used in the Phase 2 slice)
// communicate over the local filesystem.
//
//   launcher --(launch.json)--> game        (read-only launch context)
//   game     --(events.ndjson)--> launcher   (append-only event log)
//   game     --(result.json)--> launcher     (final summary on clean exit)
//
// Both the TypeScript launcher and the (future) GDScript DabbleSDK must agree
// on these shapes and constants. This file contains ONLY plain types and
// constants — no Node, DOM, Electron, or runtime dependencies — so it is safe
// to import from the main process, the preload bridge, and the renderer.
// ===========================================================================

/** Bump when the on-disk contract changes in a breaking way. */
export const CONTRACT_VERSION = 1

/** Command-line flags passed to the game executable. */
export const ARG_SESSION = '--dabble-session'
export const ARG_CONTRACT = '--dabble-contract'

/** File names inside a session folder. */
export const LAUNCH_FILE = 'launch.json'
export const EVENTS_FILE = 'events.ndjson'
export const RESULT_FILE = 'result.json'

/** A read-only snapshot of the child profile handed to the game. */
export interface ProfileSnapshot {
  id: string
  name: string
  age: number
  color: string
  icon: string
}

/** A read-only snapshot of the settings a game is allowed to see. */
export interface SettingsSnapshot {
  soundEnabled: boolean
  locale: string
  reducedMotion: boolean
}

/** Per-session info (time budget, identifiers, timing). */
export interface SessionInfo {
  /** Whole seconds of screen time remaining for the child today. */
  remainingSeconds: number
  /** ISO timestamp the session was created by the launcher. */
  startedAt: string
}

/**
 * `launch.json` — written by the launcher, read by the game at startup.
 * The game must treat this as READ-ONLY.
 */
export interface LaunchContext {
  contractVersion: number
  sessionId: string
  game: { id: string; version: string }
  profile: ProfileSnapshot
  settings: SettingsSnapshot
  session: SessionInfo
  /**
   * The game's previously-saved per-game state
   * (`progress.modules[gameId]`), or null on first play.
   */
  moduleState: unknown
}

// --- Events (game -> launcher, one JSON object per line) -------------------

interface BaseEvent {
  /** ISO timestamp the event was emitted. */
  t: string
  type: string
}

/** Child opened / is playing a section (feeds favorites + visit badges). */
export interface ActivityVisitEvent extends BaseEvent {
  type: 'activity.visit'
  activityId: string
}

/** Child completed something of a given category (feeds completion badges). */
export interface CompletionEvent extends BaseEvent {
  type: 'completion'
  completionType: string
  amount: number
}

/** A game-specific, semantic event (kept for analytics / future rules). */
export interface GameEventEvent extends BaseEvent {
  type: 'game.event'
  name: string
  data?: Record<string, unknown>
}

/** The game's latest per-game persisted state (replaces previous state). */
export interface ModuleStateEvent extends BaseEvent {
  type: 'module.state'
  state: unknown
}

/** The game requests one of its DECLARED badges be awarded. */
export interface BadgeRequestEvent extends BaseEvent {
  type: 'badge.request'
  badge: { id: string; label: string; icon: string }
}

export type GameEvent =
  | ActivityVisitEvent
  | CompletionEvent
  | GameEventEvent
  | ModuleStateEvent
  | BadgeRequestEvent

/**
 * `result.json` — written by the game on a clean exit. Optional: if the game
 * crashes, the launcher still reconciles from `events.ndjson`.
 */
export interface GameResult {
  contractVersion: number
  sessionId: string
  completedCleanly: boolean
  summary?: {
    completions?: Record<string, number>
    moduleState?: unknown
  }
}

// --- Manifest (per game: games/<id>/game.json) ----------------------------

/**
 * Describes a game to the launcher. The launcher builds its library from these
 * manifests, so adding a game requires no launcher code changes.
 */
export interface GameManifest {
  id: string
  title: string
  icon: string
  description: string
  version: string
  contractVersion: number
  /** Which home-screen section this game belongs to (e.g. "play"). */
  section: string
  ageRange?: [number, number]
  /**
   * How the launcher starts the game.
   *  - "node":   a placeholder/dev game run with the bundled Node/Electron
   *              runtime (used by the Phase 2 slice). `entry` is a script path.
   *  - "godot":  a Godot project run via an installed Godot binary (DEV ONLY —
   *              requires Godot on the machine; the production path is
   *              "native"). The game dir is the Godot project root.
   *  - "native": a real exported executable, one per platform (production).
   */
  runtime: 'node' | 'godot' | 'native'
  /** For runtime "node": path to the entry script, relative to the game dir. */
  entry?: string
  /** For runtime "native": executable path per platform, relative to game dir. */
  executables?: Partial<Record<NodeJS.Platform, string>>
  /** Completion categories this game can report. */
  completionTypes: string[]
  /** Badges this game is allowed to request (allow-list). */
  declaredBadges: Array<{ id: string; label: string; icon: string }>
}
