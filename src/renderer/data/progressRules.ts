import type { ChildProgress } from '../types'

// ===========================================================================
// Reward rules engine (data-driven)
//
// Badges and achievements are awarded by evaluating a list of RULES against a
// child's progress. Adding new rewards — including ones for future modules
// (AI stories, learning paths, custom achievements) — is just appending to
// this array. No changes to the engine or schema are required.
// ===========================================================================

export type RewardKind = 'badge' | 'achievement'

export interface ProgressRule {
  /** Stable id; also used to dedupe so a reward is granted only once. */
  id: string
  kind: RewardKind
  label: string
  /** Used for achievements; ignored for badges. */
  description: string
  icon: string
  /** Returns true when the child currently qualifies for this reward. */
  test: (progress: ChildProgress) => boolean
}

/** Convenience accessors used by the rule predicates. */
const completed = (p: ChildProgress, type: string): number =>
  p.completions[type] ?? 0
const visited = (p: ChildProgress, id: string): number =>
  p.activityVisits[id] ?? 0

/**
 * The default reward catalogue. Extend freely — future modules can append
 * their own rules here (or, eventually, register them at runtime).
 */
export const PROGRESS_RULES: ProgressRule[] = [
  // --- Badges ------------------------------------------------------------
  {
    id: 'reader',
    kind: 'badge',
    label: 'Reader',
    description: 'Completed your first story or book.',
    icon: '📚',
    test: (p) => completed(p, 'stories') + completed(p, 'books') >= 1
  },
  {
    id: 'bookworm',
    kind: 'badge',
    label: 'Bookworm',
    description: 'Completed 10 books.',
    icon: '🐛',
    test: (p) => completed(p, 'books') >= 10
  },
  {
    id: 'creator',
    kind: 'badge',
    label: 'Creator',
    description: 'Finished a creative project.',
    icon: '🎨',
    test: (p) => completed(p, 'creative') >= 1
  },
  {
    id: 'explorer',
    kind: 'badge',
    label: 'Explorer',
    description: 'Made a discovery while exploring.',
    icon: '🧭',
    test: (p) => completed(p, 'discoveries') >= 1 || visited(p, 'explore') >= 1
  },
  {
    id: 'coder',
    kind: 'badge',
    label: 'Coder',
    description: 'Finished a coding activity.',
    icon: '🤖',
    test: (p) => completed(p, 'coding') >= 1
  },
  {
    id: 'scientist',
    kind: 'badge',
    label: 'Scientist',
    description: 'Completed 5 learning activities.',
    icon: '🔬',
    test: (p) => completed(p, 'educational') >= 5
  },
  // --- Achievements ------------------------------------------------------
  {
    id: 'first-steps',
    kind: 'achievement',
    label: 'First Steps',
    description: 'Started your DabbleDuck journey.',
    icon: '🐣',
    test: (p) => p.lifetimeMinutes > 0 || Object.keys(p.activityVisits).length > 0
  },
  {
    id: 'storyteller',
    kind: 'achievement',
    label: 'Storyteller',
    description: 'Completed 5 stories.',
    icon: '✨',
    test: (p) => completed(p, 'stories') >= 5
  },
  {
    id: 'master-builder',
    kind: 'achievement',
    label: 'Master Builder',
    description: 'Completed 10 creative projects.',
    icon: '🏗️',
    test: (p) => completed(p, 'creative') >= 10
  },
  {
    id: 'curious-mind',
    kind: 'achievement',
    label: 'Curious Mind',
    description: 'Completed 10 learning activities.',
    icon: '💡',
    test: (p) => completed(p, 'educational') >= 10
  },
  {
    id: 'little-programmer',
    kind: 'achievement',
    label: 'Little Programmer',
    description: 'Completed 5 coding activities.',
    icon: '💻',
    test: (p) => completed(p, 'coding') >= 5
  },
  {
    id: 'three-day-streak',
    kind: 'achievement',
    label: '3-Day Streak',
    description: 'Visited DabbleDuck 3 days in a row.',
    icon: '🔥',
    test: (p) => p.streak.longestDays >= 3
  },
  {
    id: 'week-streak',
    kind: 'achievement',
    label: 'Week Streak',
    description: 'Visited DabbleDuck 7 days in a row.',
    icon: '🌟',
    test: (p) => p.streak.longestDays >= 7
  }
]
