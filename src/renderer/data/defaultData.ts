import type {
  Activity,
  ActivityId,
  ChildProgress,
  CompletionType,
  Profile,
  ProgressData,
  Settings,
  UsageData
} from '../types'

/** The seven activity sections shown on the child home screen. */
export const ACTIVITIES: Activity[] = [
  {
    id: 'learn',
    title: 'Learn',
    icon: '🧠',
    description: 'Practice numbers, letters, and problem solving.'
  },
  {
    id: 'read',
    title: 'Read',
    icon: '📚',
    description: 'Cozy up with stories and picture books.'
  },
  {
    id: 'create',
    title: 'Create',
    icon: '🎨',
    description: 'Draw, build, and make something fun.'
  },
  {
    id: 'explore',
    title: 'Explore',
    icon: '🔭',
    description: 'Discover animals, space, and the world around you.'
  },
  {
    id: 'watch',
    title: 'Watch',
    icon: '🎬',
    description: 'Enjoy approved shows and friendly videos.'
  },
  {
    id: 'play',
    title: 'Play',
    icon: '🎲',
    description: 'Have fun with safe games and puzzles.'
  },
  {
    id: 'code',
    title: 'Code',
    icon: '🤖',
    description: 'Make the computer do clever things with code.'
  }
]

/** Helper: every activity enabled by default. */
function allActivitiesEnabled(): Record<ActivityId, boolean> {
  return ACTIVITIES.reduce(
    (acc, activity) => {
      acc[activity.id] = true
      return acc
    },
    {} as Record<ActivityId, boolean>
  )
}

/** Default settings used on first launch. */
export const DEFAULT_SETTINGS: Settings = {
  parentPin: '1234',
  kioskMode: false,
  allowedActivities: allActivitiesEnabled()
}

/** Sample profiles seeded on first launch. */
export const DEFAULT_PROFILES: Profile[] = [
  {
    id: 'addie',
    name: 'Addie',
    age: 7,
    color: '#FFD23F',
    icon: '🦊',
    dailyLimitMinutes: 60
  },
  {
    id: 'declan',
    name: 'Declan',
    age: 5,
    color: '#4DA8DA',
    icon: '🐢',
    dailyLimitMinutes: 45
  }
]

/** Usage starts empty; records are created as profiles are used. */
export const DEFAULT_USAGE: UsageData = {}

// ===========================================================================
// Progress / growth configuration
//
// These maps are CONVENTIONS, not constraints. The progress schema stores
// completions and visits as open string-keyed maps, so adding a new entry
// here (or a brand-new key from a future module) requires no schema change.
// ===========================================================================

/**
 * Default mapping of an activity section to the completion category it
 * contributes to when a child finishes something. Future modules can record
 * their own completion types directly without appearing in this table.
 */
export const ACTIVITY_COMPLETION_TYPE: Record<ActivityId, CompletionType> = {
  learn: 'educational',
  read: 'stories',
  create: 'creative',
  explore: 'discoveries',
  watch: 'videos',
  play: 'games',
  code: 'coding'
}

/** Friendly, child-positive label for a completion button on each activity. */
export const COMPLETION_VERBS: Record<ActivityId, string> = {
  learn: 'I finished a learning activity!',
  read: 'I finished a story!',
  create: 'I finished my project!',
  explore: 'I discovered something new!',
  watch: 'I finished watching!',
  play: 'I finished playing!',
  code: 'I finished my code!'
}

/** Human-readable labels for known completion categories (with fallback). */
export const COMPLETION_LABELS: Record<string, string> = {
  books: 'Books completed',
  stories: 'Stories completed',
  educational: 'Learning activities completed',
  creative: 'Creative projects completed',
  discoveries: 'Discoveries made',
  videos: 'Videos watched',
  games: 'Games played',
  coding: 'Coding activities completed'
}

/** Icons for known completion categories (with fallback). */
export const COMPLETION_ICONS: Record<string, string> = {
  books: '📖',
  stories: '📚',
  educational: '🧠',
  creative: '🎨',
  discoveries: '🔭',
  videos: '🎬',
  games: '🎲',
  coding: '🤖'
}

/** Pretty-print an unknown completion/module key as a fallback label. */
export function prettifyKey(key: string): string {
  return key
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Sample progress seeded on first launch so the dashboards and child progress
 * screen are immediately meaningful. Real values accrue as children use the
 * app. Streaks recalculate on the next login based on these dates.
 */
export const DEFAULT_PROGRESS: ProgressData = {
  addie: {
    profileId: 'addie',
    completions: {
      books: 12,
      stories: 8,
      educational: 45,
      creative: 6,
      coding: 3,
      discoveries: 9
    },
    activityVisits: {
      learn: 30,
      read: 22,
      create: 14,
      explore: 9,
      watch: 8,
      play: 11,
      code: 4
    },
    badges: [
      { id: 'reader', label: 'Reader', icon: '📚', earnedAt: '2026-05-02T10:00:00.000Z' },
      { id: 'creator', label: 'Creator', icon: '🎨', earnedAt: '2026-05-10T10:00:00.000Z' },
      { id: 'explorer', label: 'Explorer', icon: '🧭', earnedAt: '2026-05-18T10:00:00.000Z' }
    ],
    achievements: [
      {
        id: 'first-steps',
        label: 'First Steps',
        description: 'Started your DabbleDuck journey.',
        icon: '🐣',
        earnedAt: '2026-04-01T10:00:00.000Z'
      },
      {
        id: 'storyteller',
        label: 'Storyteller',
        description: 'Completed 5 stories.',
        icon: '✨',
        earnedAt: '2026-05-20T10:00:00.000Z'
      }
    ],
    favoriteActivities: ['learn', 'read', 'create'],
    lastActivity: 'read',
    lifetimeMinutes: 840,
    streak: {
      currentDays: 7,
      longestDays: 9,
      lastActiveDate: '2026-06-17',
      firstUseDate: '2026-04-01'
    },
    modules: {},
    schemaVersion: 1,
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-06-17T18:00:00.000Z'
  },
  declan: {
    profileId: 'declan',
    completions: {
      books: 3,
      stories: 4,
      educational: 18,
      creative: 9,
      games: 12,
      discoveries: 5
    },
    activityVisits: {
      learn: 12,
      read: 7,
      create: 16,
      explore: 5,
      watch: 10,
      play: 19,
      code: 1
    },
    badges: [
      { id: 'creator', label: 'Creator', icon: '🎨', earnedAt: '2026-05-15T10:00:00.000Z' }
    ],
    achievements: [
      {
        id: 'first-steps',
        label: 'First Steps',
        description: 'Started your DabbleDuck journey.',
        icon: '🐣',
        earnedAt: '2026-04-20T10:00:00.000Z'
      }
    ],
    favoriteActivities: ['play', 'create', 'watch'],
    lastActivity: 'play',
    lifetimeMinutes: 320,
    streak: {
      currentDays: 3,
      longestDays: 4,
      lastActiveDate: '2026-06-16',
      firstUseDate: '2026-04-20'
    },
    modules: {},
    schemaVersion: 1,
    createdAt: '2026-04-20T10:00:00.000Z',
    updatedAt: '2026-06-16T18:00:00.000Z'
  }
}

/**
 * Build a fresh, empty progress record for a newly created child.
 * Kept here (not in the service) so storage seeding and the service share
 * one definition of "a blank journey".
 */
export function createBlankProgress(profileId: string): ChildProgress {
  const now = new Date().toISOString()
  return {
    profileId,
    completions: {},
    activityVisits: {},
    badges: [],
    achievements: [],
    favoriteActivities: [],
    lastActivity: null,
    lifetimeMinutes: 0,
    streak: {
      currentDays: 0,
      longestDays: 0,
      lastActiveDate: null,
      firstUseDate: null
    },
    modules: {},
    schemaVersion: 1,
    createdAt: now,
    updatedAt: now
  }
}
