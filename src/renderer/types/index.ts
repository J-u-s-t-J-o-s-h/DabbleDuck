// Shared type definitions for DabbleDuck.
//
// The canonical, dependency-free data shapes (Profile, Settings, UsageData,
// ChildProgress, ...) now live in `src/shared/dataModel.ts` so they can be
// reused by the launcher AND the optional Hub service. This file re-exports
// them (so every existing `from '../types'` import keeps working) and adds the
// launcher-only types that depend on the DOM / preload bridge.

export * from '../../shared/dataModel'

import type {
  Profile,
  ProgressData,
  Settings,
  UsageData
} from '../../shared/dataModel'
import type { DeviceSummary } from '../../shared/hubContract'

export type { DeviceSummary } from '../../shared/hubContract'

// ===========================================================================
// External (cross-process) game launch
// ===========================================================================

/** Request to launch a standalone game for a given child. */
export interface GameLaunchRequest {
  gameId: string
  profileId: string
}

/** A reward newly earned during a game session (for celebration UI). */
export interface GameRewardSummary {
  id: string
  kind: 'badge' | 'achievement'
  label: string
  icon: string
}

/** Result of launching, running, and reconciling a standalone game. */
export interface GameLaunchResult {
  ok: boolean
  /** True if the game wrote a clean result.json (vs. crashed/partial). */
  completedCleanly: boolean
  sessionId: string
  /** Rewards earned this session, to celebrate on return. */
  newlyEarned: GameRewardSummary[]
  /** The full, updated progress map after reconciliation. */
  progress: ProgressData
  /** Set when ok is false. */
  error?: string
}

// ===========================================================================
// Optional Hub client operations (exposed via the preload bridge)
// ===========================================================================

/** Result of a connectivity test against a configured Hub. */
export interface HubTestResult {
  ok: boolean
  /** Hub name when reachable. */
  hubName?: string
  /** Hub protocol version when reachable. */
  protocolVersion?: number
  error?: string
}

/** Result of pairing this device with a Hub. */
export interface HubPairResult {
  ok: boolean
  deviceId?: string
  error?: string
}

/** Result of listing the devices paired with the Hub. */
export interface HubDevicesResult {
  ok: boolean
  devices?: DeviceSummary[]
  error?: string
}

/** Result of a manual push+pull sync with the Hub. */
export interface HubSyncResult {
  ok: boolean
  /** Number of profiles pushed. */
  pushedProfiles?: number
  /** Number of family profiles pulled. */
  pulledProfiles?: number
  /** Change-log cursor reported by the Hub. */
  cursor?: number
  error?: string
}

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
  /** Launch a standalone game, then reconcile its progress on exit. */
  launchGame: (req: GameLaunchRequest) => Promise<GameLaunchResult>
  /** Test connectivity to the currently configured Hub. */
  hubTest: () => Promise<HubTestResult>
  /** Pair this device with the configured Hub. */
  hubPair: (deviceName: string) => Promise<HubPairResult>
  /** Run a manual push+pull sync with the Hub. */
  hubSync: () => Promise<HubSyncResult>
  /** List devices paired with the Hub (Connected Devices view). */
  hubDevices: () => Promise<HubDevicesResult>
  /** Suggested device name from the local machine hostname. */
  hubSuggestedName: () => Promise<string>
}

declare global {
  interface Window {
    dabble: DabbleApi
  }
}
