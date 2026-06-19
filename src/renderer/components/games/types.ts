import type { EarnedReward } from '../../services/progressService'

/**
 * The contract every DabbleDuck game implements. Keeping this small and shared
 * means new games drop into the registry without touching the hub or App.
 */
export interface GameProps {
  /**
   * Call when the child finishes/wins the game. Records a completion in the
   * child's long-term progress and returns any rewards newly earned, so the
   * game can celebrate them.
   */
  onWin: () => EarnedReward[]
  /** Leave the game and return to the games hub. */
  onExit: () => void
  /**
   * Persistent, game-specific state backed by the child's progress record
   * (`progress.modules[gameId]`). Used for things like unlocked levels, best
   * times, and totals. `undefined` until the child has played.
   */
  moduleState: unknown
  /** Persist this game's module state to the child's progress. */
  saveModuleState: (state: unknown) => void
}
