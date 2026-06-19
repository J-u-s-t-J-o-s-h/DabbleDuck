import {
  COMPLETION_ICONS,
  COMPLETION_LABELS,
  createBlankProgress,
  prettifyKey
} from '../data/defaultData'
import { PROGRESS_RULES } from '../data/progressRules'
import type {
  Achievement,
  Badge,
  ChildProgress,
  CompletionType,
  ProgressData
} from '../types'

// ===========================================================================
// Progress Service
//
// The single home for all long-term growth logic. Functions that mutate a
// child's journey are PURE: they take a ChildProgress and return a new one,
// which keeps them easy to test and reason about. Persistence is handled
// separately via the load/save wrappers (backed by the main process).
//
// Built for extensibility: completions and activity ids are open strings, and
// rewards are evaluated from a data-driven rule list, so future modules plug
// in without touching this file's core logic.
// ===========================================================================

const CURRENT_SCHEMA_VERSION = 1
const MAX_FAVORITES = 3

/** A reward that was newly earned during an update (for celebration UI). */
export interface EarnedReward {
  id: string
  kind: 'badge' | 'achievement'
  label: string
  icon: string
}

/** A milestone summary line for dashboards (derived, not stored). */
export interface Milestone {
  id: string
  label: string
  value: number
  icon: string
}

function nowIso(): string {
  return new Date().toISOString()
}

function dayBefore(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

// --- Defaults & migration --------------------------------------------------

/** Create a fresh, empty progress record for a new child. */
export function createDefaultProgress(profileId: string): ChildProgress {
  return createBlankProgress(profileId)
}

/**
 * Return a valid, fully-populated progress record for a profile, creating a
 * default when missing and back-filling any fields absent from older data.
 * This makes the schema forward/backward tolerant (future-proofing).
 */
export function ensureProgress(
  data: ProgressData,
  profileId: string
): ChildProgress {
  const existing = data[profileId]
  if (!existing) return createDefaultProgress(profileId)

  const base = createBlankProgress(profileId)
  return {
    ...base,
    ...existing,
    profileId,
    completions: { ...base.completions, ...existing.completions },
    activityVisits: { ...base.activityVisits, ...existing.activityVisits },
    badges: existing.badges ?? [],
    achievements: existing.achievements ?? [],
    favoriteActivities: existing.favoriteActivities ?? [],
    streak: { ...base.streak, ...existing.streak },
    modules: { ...base.modules, ...existing.modules },
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt: existing.createdAt ?? base.createdAt
  }
}

// --- Derivations -----------------------------------------------------------

/** Compute the child's favorite activities (most-visited first). */
export function calculateFavoriteActivities(
  progress: ChildProgress,
  topN: number = MAX_FAVORITES
): string[] {
  return Object.entries(progress.activityVisits)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([id]) => id)
}

/** Most-used activities with their visit counts (for parent analytics). */
export function mostUsedActivities(
  progress: ChildProgress,
  topN = 5
): Array<{ id: string; count: number }> {
  return Object.entries(progress.activityVisits)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([id, count]) => ({ id, count }))
}

/** Derive learning milestones from completion counters. */
export function deriveMilestones(progress: ChildProgress): Milestone[] {
  return Object.entries(progress.completions)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([key, value]) => ({
      id: key,
      label: COMPLETION_LABELS[key] ?? prettifyKey(key),
      value,
      icon: COMPLETION_ICONS[key] ?? '⭐'
    }))
}

/** Most recent badges + achievements, newest first. */
export function recentAccomplishments(
  progress: ChildProgress,
  limit = 6
): EarnedReward[] {
  const withTime = [
    ...progress.badges.map((b) => ({
      id: b.id,
      kind: 'badge' as const,
      label: b.label,
      icon: b.icon,
      at: b.earnedAt
    })),
    ...progress.achievements.map((a) => ({
      id: a.id,
      kind: 'achievement' as const,
      label: a.label,
      icon: a.icon,
      at: a.earnedAt
    }))
  ]
  return withTime
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, limit)
    .map(({ id, kind, label, icon }) => ({ id, kind, label, icon }))
}

// --- Reward evaluation (data-driven) --------------------------------------

/**
 * Evaluate all reward rules against the progress record, granting any newly
 * qualified badges/achievements (deduped by id). Returns the updated record
 * plus the list of rewards earned in this pass (for celebration UI).
 */
export function applyRules(progress: ChildProgress): {
  progress: ChildProgress
  newlyEarned: EarnedReward[]
} {
  const earnedBadgeIds = new Set(progress.badges.map((b) => b.id))
  const earnedAchievementIds = new Set(progress.achievements.map((a) => a.id))

  const newBadges: Badge[] = []
  const newAchievements: Achievement[] = []
  const newlyEarned: EarnedReward[] = []
  const stamp = nowIso()

  for (const rule of PROGRESS_RULES) {
    const alreadyHave =
      rule.kind === 'badge'
        ? earnedBadgeIds.has(rule.id)
        : earnedAchievementIds.has(rule.id)
    if (alreadyHave) continue
    if (!rule.test(progress)) continue

    if (rule.kind === 'badge') {
      newBadges.push({
        id: rule.id,
        label: rule.label,
        icon: rule.icon,
        earnedAt: stamp
      })
    } else {
      newAchievements.push({
        id: rule.id,
        label: rule.label,
        description: rule.description,
        icon: rule.icon,
        earnedAt: stamp
      })
    }
    newlyEarned.push({
      id: rule.id,
      kind: rule.kind,
      label: rule.label,
      icon: rule.icon
    })
  }

  if (newlyEarned.length === 0) {
    return { progress, newlyEarned }
  }

  return {
    progress: {
      ...progress,
      badges: [...progress.badges, ...newBadges],
      achievements: [...progress.achievements, ...newAchievements],
      updatedAt: stamp
    },
    newlyEarned
  }
}

/**
 * Recompute derived fields (favorites) and evaluate rewards. Called after any
 * change so the record stays internally consistent.
 */
function refresh(progress: ChildProgress): {
  progress: ChildProgress
  newlyEarned: EarnedReward[]
} {
  const withFavorites: ChildProgress = {
    ...progress,
    favoriteActivities: calculateFavoriteActivities(progress),
    updatedAt: nowIso()
  }
  return applyRules(withFavorites)
}

// --- Mutations (pure) ------------------------------------------------------

/** Record that the child opened an activity / module. */
export function recordActivityVisit(
  progress: ChildProgress,
  activityId: string
): { progress: ChildProgress; newlyEarned: EarnedReward[] } {
  const visits = { ...progress.activityVisits }
  visits[activityId] = (visits[activityId] ?? 0) + 1
  return refresh({
    ...progress,
    activityVisits: visits,
    lastActivity: activityId
  })
}

/** Record that the child completed something of a given category. */
export function recordCompletion(
  progress: ChildProgress,
  type: CompletionType,
  amount = 1
): { progress: ChildProgress; newlyEarned: EarnedReward[] } {
  const completions = { ...progress.completions }
  completions[type] = (completions[type] ?? 0) + amount
  return refresh({ ...progress, completions })
}

/** Add lifetime minutes (called as session time accrues). */
export function addLifetimeMinutes(
  progress: ChildProgress,
  minutes: number
): ChildProgress {
  if (minutes <= 0) return progress
  return {
    ...progress,
    lifetimeMinutes: progress.lifetimeMinutes + minutes,
    updatedAt: nowIso()
  }
}

/**
 * Mark the child active for `today` (YYYY-MM-DD) and update streak counters.
 * Consecutive days extend the streak; a gap resets it to 1.
 */
export function registerActiveDay(
  progress: ChildProgress,
  today: string
): { progress: ChildProgress; newlyEarned: EarnedReward[] } {
  const { lastActiveDate } = progress.streak
  let current = progress.streak.currentDays

  if (lastActiveDate === today) {
    current = Math.max(current, 1)
  } else if (lastActiveDate && dayBefore(today) === lastActiveDate) {
    current = current + 1
  } else {
    current = 1
  }

  const longest = Math.max(progress.streak.longestDays, current)
  const updated: ChildProgress = {
    ...progress,
    streak: {
      currentDays: current,
      longestDays: longest,
      lastActiveDate: today,
      firstUseDate: progress.streak.firstUseDate ?? today
    }
  }
  return refresh(updated)
}

/**
 * Directly award a custom badge (e.g. from a future module). Deduped by id.
 */
export function awardBadge(
  progress: ChildProgress,
  badge: Omit<Badge, 'earnedAt'>
): ChildProgress {
  if (progress.badges.some((b) => b.id === badge.id)) return progress
  return {
    ...progress,
    badges: [...progress.badges, { ...badge, earnedAt: nowIso() }],
    updatedAt: nowIso()
  }
}

/**
 * Directly award a custom achievement (e.g. from a future module). Deduped.
 */
export function awardAchievement(
  progress: ChildProgress,
  achievement: Omit<Achievement, 'earnedAt'>
): ChildProgress {
  if (progress.achievements.some((a) => a.id === achievement.id)) return progress
  return {
    ...progress,
    achievements: [
      ...progress.achievements,
      { ...achievement, earnedAt: nowIso() }
    ],
    updatedAt: nowIso()
  }
}

/**
 * Read or write arbitrary module-specific state. Future modules (reading
 * tracker, learning paths, AI stories) use this escape hatch to persist their
 * own data alongside the shared progress record without a schema change.
 */
export function setModuleState(
  progress: ChildProgress,
  moduleId: string,
  state: unknown
): ChildProgress {
  return {
    ...progress,
    modules: { ...progress.modules, [moduleId]: state },
    updatedAt: nowIso()
  }
}
