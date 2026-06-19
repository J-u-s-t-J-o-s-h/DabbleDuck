import { useCallback, useEffect, useRef, useState } from 'react'
import { ACTIVITIES, ACTIVITY_COMPLETION_TYPE, COMPLETION_VERBS } from './data/defaultData'
import type {
  ActivityId,
  Profile,
  ProgressData,
  Settings,
  UsageData,
  UsageRecord
} from './types'
import {
  addLifetimeMinutes,
  ensureProgress,
  recordActivityVisit,
  recordCompletion,
  registerActiveDay,
  setModuleState,
  type EarnedReward
} from './services/progressService'
import ProfileSelector from './components/ProfileSelector'
import HomeScreen from './components/HomeScreen'
import ActivityPage from './components/ActivityPage'
import ParentPinModal from './components/ParentPinModal'
import ParentDashboard from './components/ParentDashboard'
import ProgressScreen from './components/ProgressScreen'
import PlayHub from './components/PlayHub'
import TimeLimitScreen from './components/TimeLimitScreen'

type Screen =
  | 'profileSelect'
  | 'home'
  | 'activity'
  | 'childProgress'
  | 'parentDashboard'
  | 'timeLimit'

/** How often (in ms) accumulated usage is flushed to disk. */
const FLUSH_INTERVAL_MS = 15000

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Return a usage record that is valid for `today`, resetting the daily
 * seconds counter (and stale override) when the day has rolled over.
 */
function normalizeRecord(
  record: UsageRecord | undefined,
  today: string
): UsageRecord {
  if (!record) {
    return {
      date: today,
      secondsUsedToday: 0,
      activityCounts: {},
      lastActiveDate: today
    }
  }
  if (record.date !== today) {
    return {
      ...record,
      date: today,
      secondsUsedToday: 0,
      lastActiveDate: today,
      overrideDate:
        record.overrideDate === today ? record.overrideDate : undefined
    }
  }
  return record
}

/** Whether a profile has hit its daily limit today (ignoring overrides). */
function isLimitReached(profile: Profile, record: UsageRecord): boolean {
  const today = todayStr()
  if (record.overrideDate === today) return false
  return record.secondsUsedToday >= profile.dailyLimitMinutes * 60
}

export default function App(): JSX.Element {
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [usage, setUsageState] = useState<UsageData>({})
  const [progress, setProgressState] = useState<ProgressData>({})

  const [screen, setScreen] = useState<Screen>('profileSelect')
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null)
  const [activeActivity, setActiveActivity] = useState<ActivityId | null>(null)

  const [showPinModal, setShowPinModal] = useState(false)

  // Keep refs of the latest data so interval callbacks read fresh values.
  const usageRef = useRef<UsageData>(usage)
  useEffect(() => {
    usageRef.current = usage
  }, [usage])

  const progressRef = useRef<ProgressData>(progress)
  useEffect(() => {
    progressRef.current = progress
  }, [progress])

  const activeProfileIdRef = useRef<string | null>(null)
  useEffect(() => {
    activeProfileIdRef.current = activeProfileId
  }, [activeProfileId])

  // Seconds accrued this session, awaiting conversion into lifetime minutes.
  const sessionSecondsRef = useRef(0)

  // --- Initial load ------------------------------------------------------
  useEffect(() => {
    let cancelled = false
    async function load(): Promise<void> {
      const [s, p, u, pr] = await Promise.all([
        window.dabble.getSettings(),
        window.dabble.getProfiles(),
        window.dabble.getUsage(),
        window.dabble.getProgress()
      ])
      if (cancelled) return
      setSettings(s)
      setProfiles(p)
      setUsageState(u)
      setProgressState(pr)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const activeProfile =
    profiles.find((p) => p.id === activeProfileId) ?? null

  /** Persist usage immediately (used for discrete events). */
  const persistUsage = useCallback((next: UsageData) => {
    usageRef.current = next
    setUsageState(next)
    window.dabble.saveUsage(next)
  }, [])

  /** Persist progress immediately (used for discrete events). */
  const persistProgress = useCallback((next: ProgressData) => {
    progressRef.current = next
    setProgressState(next)
    window.dabble.saveProgress(next)
  }, [])

  /** Persist settings (PIN, kiosk, allowed activities). */
  const persistSettings = useCallback((next: Settings) => {
    setSettings(next)
    window.dabble.saveSettings(next)
  }, [])

  /**
   * Convert accrued session seconds into whole lifetime minutes on the active
   * child's progress record. Leftover seconds carry over to the next commit.
   */
  const commitLifetime = useCallback(() => {
    const pid = activeProfileIdRef.current
    if (!pid) return
    const wholeMinutes = Math.floor(sessionSecondsRef.current / 60)
    if (wholeMinutes <= 0) return
    sessionSecondsRef.current -= wholeMinutes * 60
    const current = ensureProgress(progressRef.current, pid)
    const updated = addLifetimeMinutes(current, wholeMinutes)
    persistProgress({ ...progressRef.current, [pid]: updated })
  }, [persistProgress])

  // --- Usage ticking (1s) while a child is actively using the app -------
  useEffect(() => {
    const childActive =
      activeProfileId &&
      (screen === 'home' || screen === 'activity' || screen === 'childProgress')
    if (!childActive) return

    const intervalId = window.setInterval(() => {
      const profile = profiles.find((p) => p.id === activeProfileId)
      if (!profile) return
      sessionSecondsRef.current += 1
      const today = todayStr()
      const record = normalizeRecord(usageRef.current[activeProfileId], today)
      const nextSeconds = record.secondsUsedToday + 1
      const updated: UsageRecord = {
        ...record,
        secondsUsedToday: nextSeconds,
        date: today,
        lastActiveDate: today
      }
      const next: UsageData = { ...usageRef.current, [activeProfileId]: updated }
      usageRef.current = next
      setUsageState(next)

      if (isLimitReached(profile, updated)) {
        setScreen('timeLimit')
      }
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [activeProfileId, screen, profiles])

  // --- Periodic flush to disk -------------------------------------------
  useEffect(() => {
    const flush = (): void => {
      window.dabble.saveUsage(usageRef.current)
      commitLifetime()
    }
    const intervalId = window.setInterval(flush, FLUSH_INTERVAL_MS)
    return () => {
      window.clearInterval(intervalId)
      flush()
    }
  }, [commitLifetime])

  // --- Navigation handlers ----------------------------------------------
  const handleSelectProfile = useCallback(
    (profileId: string) => {
      const profile = profiles.find((p) => p.id === profileId)
      if (!profile) return
      const today = todayStr()

      // Reset the session lifetime accumulator for the new child.
      sessionSecondsRef.current = 0

      // Usage: ensure a record exists for today.
      const record = normalizeRecord(usageRef.current[profileId], today)
      persistUsage({ ...usageRef.current, [profileId]: record })

      // Progress: ensure a record exists and update the daily streak.
      const baseProgress = ensureProgress(progressRef.current, profileId)
      const { progress: withStreak } = registerActiveDay(baseProgress, today)
      persistProgress({ ...progressRef.current, [profileId]: withStreak })

      setActiveProfileId(profileId)
      setActiveActivity(null)
      setScreen(isLimitReached(profile, record) ? 'timeLimit' : 'home')
    },
    [profiles, persistUsage, persistProgress]
  )

  const handleOpenActivity = useCallback(
    (activityId: ActivityId) => {
      const pid = activeProfileIdRef.current
      if (!pid) return
      const today = todayStr()

      // Usage: bump the per-day visit count.
      const record = normalizeRecord(usageRef.current[pid], today)
      const counts = { ...record.activityCounts }
      counts[activityId] = (counts[activityId] ?? 0) + 1
      const updated: UsageRecord = { ...record, activityCounts: counts }
      persistUsage({ ...usageRef.current, [pid]: updated })

      // Progress: record the lifetime activity visit.
      const baseProgress = ensureProgress(progressRef.current, pid)
      const { progress: withVisit } = recordActivityVisit(
        baseProgress,
        activityId
      )
      persistProgress({ ...progressRef.current, [pid]: withVisit })

      setActiveActivity(activityId)
      setScreen('activity')
    },
    [persistUsage, persistProgress]
  )

  /**
   * Record a completion for the current activity and return any newly earned
   * rewards so the activity page can celebrate them.
   */
  const handleCompleteActivity = useCallback(
    (activityId: ActivityId): EarnedReward[] => {
      const pid = activeProfileIdRef.current
      if (!pid) return []
      const completionType = ACTIVITY_COMPLETION_TYPE[activityId]
      const baseProgress = ensureProgress(progressRef.current, pid)
      const { progress: updated, newlyEarned } = recordCompletion(
        baseProgress,
        completionType
      )
      persistProgress({ ...progressRef.current, [pid]: updated })
      return newlyEarned
    },
    [persistProgress]
  )

  /** Read a game's persistent module state from the active child's progress. */
  const getGameModuleState = useCallback((gameId: string): unknown => {
    const pid = activeProfileIdRef.current
    if (!pid) return undefined
    return ensureProgress(progressRef.current, pid).modules[gameId]
  }, [])

  /** Persist a game's module state to the active child's progress. */
  const saveGameModuleState = useCallback(
    (gameId: string, state: unknown) => {
      const pid = activeProfileIdRef.current
      if (!pid) return
      const current = ensureProgress(progressRef.current, pid)
      const updated = setModuleState(current, gameId, state)
      persistProgress({ ...progressRef.current, [pid]: updated })
    },
    [persistProgress]
  )

  const handleBackToHome = useCallback(() => {
    setActiveActivity(null)
    setScreen('home')
  }, [])

  const handleOpenProgress = useCallback(() => {
    setScreen('childProgress')
  }, [])

  const handleExitToProfiles = useCallback(() => {
    commitLifetime()
    window.dabble.saveUsage(usageRef.current)
    setActiveProfileId(null)
    setActiveActivity(null)
    setScreen('profileSelect')
  }, [commitLifetime])

  // --- Parent PIN flow ---------------------------------------------------
  const openPin = useCallback(() => {
    setShowPinModal(true)
  }, [])

  const handlePinSuccess = useCallback(() => {
    setShowPinModal(false)
    setScreen('parentDashboard')
  }, [])

  // --- Parent dashboard actions -----------------------------------------
  const handleSaveProfiles = useCallback((next: Profile[]) => {
    setProfiles(next)
    window.dabble.saveProfiles(next)
  }, [])

  const handleGrantMoreTime = useCallback(
    (profileId: string) => {
      const today = todayStr()
      const record = normalizeRecord(usageRef.current[profileId], today)
      const updated: UsageRecord = { ...record, overrideDate: today }
      persistUsage({ ...usageRef.current, [profileId]: updated })
    },
    [persistUsage]
  )

  const handleResetToday = useCallback(
    (profileId: string) => {
      const today = todayStr()
      const record = normalizeRecord(usageRef.current[profileId], today)
      const updated: UsageRecord = {
        ...record,
        secondsUsedToday: 0,
        overrideDate: undefined
      }
      persistUsage({ ...usageRef.current, [profileId]: updated })
    },
    [persistUsage]
  )

  const handleToggleKiosk = useCallback(
    (enabled: boolean) => {
      if (!settings) return
      persistSettings({ ...settings, kioskMode: enabled })
      window.dabble.setKiosk(enabled)
    },
    [settings, persistSettings]
  )

  const handleReturnToChildMode = useCallback(() => {
    setScreen('profileSelect')
    setActiveProfileId(null)
    setActiveActivity(null)
  }, [])

  // --- Render ------------------------------------------------------------
  if (loading || !settings) {
    return (
      <div className="loading-screen">
        <div className="duck-mascot duck-mascot--lg" aria-hidden="true">
          🦆
        </div>
        <p>Waddling in...</p>
      </div>
    )
  }

  if (showPinModal) {
    return (
      <ParentPinModal
        correctPin={settings.parentPin}
        onCancel={() => setShowPinModal(false)}
        onSuccess={handlePinSuccess}
      />
    )
  }

  if (screen === 'parentDashboard') {
    return (
      <ParentDashboard
        settings={settings}
        profiles={profiles}
        usage={usage}
        progress={progress}
        activities={ACTIVITIES}
        onSaveSettings={persistSettings}
        onSaveProfiles={handleSaveProfiles}
        onGrantMoreTime={handleGrantMoreTime}
        onResetToday={handleResetToday}
        onToggleKiosk={handleToggleKiosk}
        onReturnToChildMode={handleReturnToChildMode}
      />
    )
  }

  if (screen === 'timeLimit') {
    return (
      <TimeLimitScreen
        profile={activeProfile}
        onParentMode={openPin}
        onBackToProfiles={handleExitToProfiles}
      />
    )
  }

  if (screen === 'childProgress' && activeProfile) {
    const childProgress = ensureProgress(progress, activeProfile.id)
    return (
      <ProgressScreen
        profile={activeProfile}
        progress={childProgress}
        activities={ACTIVITIES}
        onBack={handleBackToHome}
      />
    )
  }

  if (screen === 'activity' && activeActivity === 'play' && activeProfile) {
    return (
      <PlayHub
        onComplete={() => handleCompleteActivity('play')}
        getModuleState={getGameModuleState}
        saveModuleState={saveGameModuleState}
        onBack={handleBackToHome}
      />
    )
  }

  if (screen === 'activity' && activeActivity && activeProfile) {
    const activity = ACTIVITIES.find((a) => a.id === activeActivity)
    if (activity) {
      return (
        <ActivityPage
          activity={activity}
          completeLabel={COMPLETION_VERBS[activity.id]}
          onComplete={() => handleCompleteActivity(activity.id)}
          onBack={handleBackToHome}
        />
      )
    }
  }

  if (screen === 'home' && activeProfile) {
    const record = normalizeRecord(usage[activeProfile.id], todayStr())
    return (
      <HomeScreen
        profile={activeProfile}
        usage={record}
        activities={ACTIVITIES}
        allowedActivities={settings.allowedActivities}
        onOpenActivity={handleOpenActivity}
        onOpenProgress={handleOpenProgress}
        onExit={handleExitToProfiles}
        onParentMode={openPin}
      />
    )
  }

  return (
    <ProfileSelector
      profiles={profiles}
      onSelect={handleSelectProfile}
      onParentMode={openPin}
    />
  )
}
