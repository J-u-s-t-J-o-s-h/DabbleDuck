import {
  applyRules,
  awardBadge,
  recordActivityVisit,
  recordCompletion,
  setModuleState,
  type EarnedReward
} from '../renderer/services/progressService'
import type { ChildProgress } from '../renderer/types'
import type { GameEvent, GameManifest } from '../shared/gameContract'

// ===========================================================================
// Game reconciler.
//
// Reads the events a game emitted and folds them into the child's canonical
// progress record using the SAME data-driven service the in-app modules use.
// The launcher is the single authoritative writer; games only ever propose
// changes via their event log. This is where cross-game badges/achievements
// are evaluated, so any game contributes to the platform reward economy.
// ===========================================================================

export interface ReconcileOutcome {
  progress: ChildProgress
  newlyEarned: EarnedReward[]
}

/**
 * Apply a game's events to a base progress record.
 *
 * @param base     the child's current progress (already ensured/migrated)
 * @param events   parsed events from the session's event log, in order
 * @param manifest the game's manifest (used to validate badge requests)
 */
export function reconcile(
  base: ChildProgress,
  events: GameEvent[],
  manifest: GameManifest
): ReconcileOutcome {
  let progress = base
  const earned = new Map<string, EarnedReward>()
  const remember = (rewards: EarnedReward[]): void => {
    for (const r of rewards) if (!earned.has(r.id)) earned.set(r.id, r)
  }

  const declaredBadgeIds = new Set(manifest.declaredBadges.map((b) => b.id))

  for (const event of events) {
    switch (event.type) {
      case 'activity.visit': {
        const res = recordActivityVisit(progress, event.activityId)
        progress = res.progress
        remember(res.newlyEarned)
        break
      }
      case 'completion': {
        const res = recordCompletion(
          progress,
          event.completionType,
          event.amount ?? 1
        )
        progress = res.progress
        remember(res.newlyEarned)
        break
      }
      case 'module.state': {
        progress = setModuleState(progress, manifest.id, event.state)
        break
      }
      case 'badge.request': {
        // A game may only be granted badges it declared in its manifest.
        if (!declaredBadgeIds.has(event.badge.id)) break
        const had = progress.badges.some((b) => b.id === event.badge.id)
        progress = awardBadge(progress, event.badge)
        if (!had && progress.badges.some((b) => b.id === event.badge.id)) {
          remember([
            {
              id: event.badge.id,
              kind: 'badge',
              label: event.badge.label,
              icon: event.badge.icon
            }
          ])
        }
        break
      }
      case 'game.event':
      default:
        // Semantic/analytics events have no progress effect (yet).
        break
    }
  }

  // Final sweep so any rule that qualifies only after all updates is granted.
  const final = applyRules(progress)
  progress = final.progress
  remember(final.newlyEarned)

  return { progress, newlyEarned: [...earned.values()] }
}
