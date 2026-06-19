// Shared type definitions for DabbleDuck.
// These types are used by both the renderer (React) and the main process
// (storage layer) so the JSON data shapes stay consistent everywhere.

/** The fixed set of activity sections shown on the child home screen. */
export type ActivityId =
  | 'learn'
  | 'read'
  | 'create'
  | 'explore'
  | 'watch'
  | 'play'
  | 'code'

/** Static metadata describing one activity section. */
export interface Activity {
  id: ActivityId
  title: string
  icon: string
  description: string
}

/** A single local child profile. */
export interface Profile {
  id: string
  name: string
  age: number
  /** Hex color used for the avatar background. */
  color: string
  /** Emoji used as the avatar icon. */
  icon: string
  /** Daily screen-time limit in minutes. */
  dailyLimitMinutes: number
}

/** App-wide settings, including the parent PIN and safety flags. */
export interface Settings {
  parentPin: string
  kioskMode: boolean
  /** Per-activity on/off toggles controlled by the parent. */
  allowedActivities: Record<ActivityId, boolean>
}

/** Usage tracking for a single profile for the current day. */
export interface UsageRecord {
  /** ISO date string (YYYY-MM-DD) the seconds below were accumulated on. */
  date: string
  /** Total seconds used today. Resets when a new day begins. */
  secondsUsedToday: number
  /** How many times each activity has been opened (lifetime). */
  activityCounts: Partial<Record<ActivityId, number>>
  /** ISO date string of the last day this profile was active. */
  lastActiveDate: string
  /**
   * If set to today's date, the daily limit is overridden for today
   * (parent unlocked extra time).
   */
  overrideDate?: string
}

/** Map of profileId -> usage record. */
export type UsageData = Record<string, UsageRecord>

// ===========================================================================
// Long-term progress / growth model
//
// Design goal: a flexible, future-proof schema. New learning modules (AI
// stories, reading tracker, educational games, coding lessons, drawing,
// learning paths, custom achievements) should be able to plug in WITHOUT a
// schema redesign. To that end, completion categories, per-activity visit
// counts, and module-specific state are all OPEN string-keyed maps rather
// than hard-coded fields.
// ===========================================================================

/**
 * A completion category id (e.g. "books", "stories", "educational",
 * "creative", "coding"). This is intentionally a plain string so future
 * modules can introduce new categories freely. Well-known defaults live in
 * `data/defaultData.ts` (COMPLETION_LABELS).
 */
export type CompletionType = string

/** A badge a child has earned. */
export interface Badge {
  id: string
  label: string
  icon: string
  /** ISO timestamp when earned. */
  earnedAt: string
}

/** An achievement a child has unlocked. */
export interface Achievement {
  id: string
  label: string
  description: string
  icon: string
  /** ISO timestamp when earned. */
  earnedAt: string
}

/** Streak / longevity tracking for a child. */
export interface StreakInfo {
  /** Length of the current consecutive-day streak. */
  currentDays: number
  /** Longest streak ever reached. */
  longestDays: number
  /** YYYY-MM-DD of the most recent active day, or null if never active. */
  lastActiveDate: string | null
  /** YYYY-MM-DD of the very first day this child used DabbleDuck. */
  firstUseDate: string | null
}

/**
 * The long-term growth record for a single child. This is the heart of the
 * persistent learning environment: it remembers a child's journey over time.
 *
 * Extensibility is baked in via three open maps:
 *  - `completions`     keyed by CompletionType (books, stories, lessons, ...)
 *  - `activityVisits`  keyed by activity/module id (learn, read, ai-story, ...)
 *  - `modules`         arbitrary per-module state for future features
 */
export interface ChildProgress {
  profileId: string
  /** Cumulative completion counts keyed by completion type. */
  completions: Record<CompletionType, number>
  /** Lifetime "open" counts keyed by activity id (and future module ids). */
  activityVisits: Record<string, number>
  badges: Badge[]
  achievements: Achievement[]
  /** Derived top-activity ids, cached for quick display. */
  favoriteActivities: string[]
  /** Id of the last activity / module the child used, or null. */
  lastActivity: string | null
  /** Total lifetime minutes spent in DabbleDuck. */
  lifetimeMinutes: number
  streak: StreakInfo
  /**
   * Open-ended bucket for future module-specific state (e.g. reading-tracker
   * book lists, learning-path positions, AI-story history). Keyed by module id.
   */
  modules: Record<string, unknown>
  /** Schema version, enabling safe future migrations. */
  schemaVersion: number
  /** ISO timestamp the record was created. */
  createdAt: string
  /** ISO timestamp of the last update. */
  updatedAt: string
}

/** Map of profileId -> long-term progress record. */
export type ProgressData = Record<string, ChildProgress>

/** The shape of the API exposed to the renderer via the preload bridge. */
export interface DabbleApi {
  getSettings: () => Promise<Settings>
  saveSettings: (settings: Settings) => Promise<Settings>
  getProfiles: () => Promise<Profile[]>
  saveProfiles: (profiles: Profile[]) => Promise<Profile[]>
  getUsage: () => Promise<UsageData>
  saveUsage: (usage: UsageData) => Promise<UsageData>
  getProgress: () => Promise<ProgressData>
  saveProgress: (progress: ProgressData) => Promise<ProgressData>
  setKiosk: (enabled: boolean) => Promise<void>
  requestExit: (pin: string) => Promise<boolean>
}

declare global {
  interface Window {
    dabble: DabbleApi
  }
}
