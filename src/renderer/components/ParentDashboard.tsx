import { useState } from 'react'
import type {
  Activity,
  ActivityId,
  HubClientSettings,
  HubDevicesResult,
  HubPairResult,
  HubSyncResult,
  HubTestResult,
  Profile,
  ProgressData,
  Settings,
  UsageData
} from '../types'
import { HUB_DEFAULT_PORT } from '../../shared/hubContract'
import ParentProgressPanel from './ParentProgressPanel'
import HubSettingsCard from './HubSettingsCard'

interface ParentDashboardProps {
  settings: Settings
  profiles: Profile[]
  usage: UsageData
  progress: ProgressData
  activities: Activity[]
  onSaveSettings: (settings: Settings) => void
  onSaveProfiles: (profiles: Profile[]) => void
  onGrantMoreTime: (profileId: string) => void
  onResetToday: (profileId: string) => void
  onToggleKiosk: (enabled: boolean) => void
  onReturnToChildMode: () => void
  onHubTest: () => Promise<HubTestResult>
  onHubPair: (deviceName: string) => Promise<HubPairResult>
  onHubSync: () => Promise<HubSyncResult>
  onHubDevices: () => Promise<HubDevicesResult>
  onHubSuggestedName: () => Promise<string>
}

const DEFAULT_HUB: HubClientSettings = {
  enabled: false,
  address: '',
  port: HUB_DEFAULT_PORT
}

function usedMinutes(usage: UsageData, profileId: string): number {
  const seconds = usage[profileId]?.secondsUsedToday ?? 0
  return Math.floor(seconds / 60)
}

export default function ParentDashboard({
  settings,
  profiles,
  usage,
  progress,
  activities,
  onSaveSettings,
  onSaveProfiles,
  onGrantMoreTime,
  onResetToday,
  onToggleKiosk,
  onReturnToChildMode,
  onHubTest,
  onHubPair,
  onHubSync,
  onHubDevices,
  onHubSuggestedName
}: ParentDashboardProps): JSX.Element {
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinMessage, setPinMessage] = useState<string | null>(null)

  const handleLimitChange = (profileId: string, value: string): void => {
    const minutes = Math.max(0, Math.min(600, Number(value) || 0))
    const next = profiles.map((p) =>
      p.id === profileId ? { ...p, dailyLimitMinutes: minutes } : p
    )
    onSaveProfiles(next)
  }

  const handleToggleActivity = (activityId: ActivityId): void => {
    const next: Settings = {
      ...settings,
      allowedActivities: {
        ...settings.allowedActivities,
        [activityId]: !settings.allowedActivities[activityId]
      }
    }
    onSaveSettings(next)
  }

  const handleChangePin = (): void => {
    if (!/^\d{4,8}$/.test(newPin)) {
      setPinMessage('PIN must be 4 to 8 digits.')
      return
    }
    if (newPin !== confirmPin) {
      setPinMessage('PINs do not match.')
      return
    }
    onSaveSettings({ ...settings, parentPin: newPin })
    setNewPin('')
    setConfirmPin('')
    setPinMessage('PIN updated.')
  }

  return (
    <div className="screen parent-dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Parent Dashboard</h1>
          <p className="dashboard-header__subtitle">
            Manage profiles, screen time, and activities.
          </p>
        </div>
        <button className="big-button" type="button" onClick={onReturnToChildMode}>
          Return to Kid Mode
        </button>
      </header>

      <section className="dashboard-section">
        <h2>Child Profiles &amp; Usage</h2>
        <div className="profile-rows">
          {profiles.map((profile) => {
            const counts = usage[profile.id]?.activityCounts ?? {}
            const lastActive = usage[profile.id]?.lastActiveDate ?? '—'
            return (
              <div className="profile-row" key={profile.id}>
                <div className="profile-row__identity">
                  <span
                    className="profile-row__avatar"
                    style={{ backgroundColor: profile.color }}
                    aria-hidden="true"
                  >
                    {profile.icon}
                  </span>
                  <div>
                    <strong>{profile.name}</strong>
                    <span className="muted"> · Age {profile.age}</span>
                    <div className="muted small">Last active: {lastActive}</div>
                  </div>
                </div>

                <div className="profile-row__stats">
                  <div className="stat">
                    <span className="stat__value">
                      {usedMinutes(usage, profile.id)}
                    </span>
                    <span className="stat__label">min used today</span>
                  </div>
                  <label className="limit-field">
                    <span>Daily limit (min)</span>
                    <input
                      type="number"
                      min={0}
                      max={600}
                      value={profile.dailyLimitMinutes}
                      onChange={(e) =>
                        handleLimitChange(profile.id, e.target.value)
                      }
                    />
                  </label>
                </div>

                <div className="profile-row__counts">
                  {activities.map((activity) => (
                    <span className="count-chip" key={activity.id}>
                      {activity.icon} {counts[activity.id] ?? 0}
                    </span>
                  ))}
                </div>

                <div className="profile-row__actions">
                  <button
                    className="pill-button"
                    type="button"
                    onClick={() => onGrantMoreTime(profile.id)}
                  >
                    Give more time today
                  </button>
                  <button
                    className="pill-button pill-button--ghost"
                    type="button"
                    onClick={() => onResetToday(profile.id)}
                  >
                    Reset today
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="dashboard-section">
        <h2>Progress &amp; Growth</h2>
        <ParentProgressPanel
          profiles={profiles}
          progress={progress}
          activities={activities}
        />
      </section>

      <section className="dashboard-section">
        <h2>Allowed Activities</h2>
        <div className="toggle-grid">
          {activities.map((activity) => {
            const enabled = settings.allowedActivities[activity.id]
            return (
              <button
                key={activity.id}
                type="button"
                className={`toggle-chip ${enabled ? 'toggle-chip--on' : ''}`}
                onClick={() => handleToggleActivity(activity.id)}
              >
                <span aria-hidden="true">{activity.icon}</span>
                {activity.title}
                <span className="toggle-chip__state">
                  {enabled ? 'On' : 'Off'}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="dashboard-section dashboard-section--split">
        <div className="settings-card">
          <h2>Change Parent PIN</h2>
          <label className="text-field">
            <span>New PIN</span>
            <input
              type="password"
              inputMode="numeric"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              placeholder="4-8 digits"
            />
          </label>
          <label className="text-field">
            <span>Confirm PIN</span>
            <input
              type="password"
              inputMode="numeric"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Re-enter PIN"
            />
          </label>
          {pinMessage && <p className="pin-message">{pinMessage}</p>}
          <button className="big-button" type="button" onClick={handleChangePin}>
            Save PIN
          </button>
        </div>

        <div className="settings-card">
          <h2>Safety</h2>
          <label className="switch-row">
            <span>
              <strong>Kiosk Mode</strong>
              <br />
              <span className="muted small">
                Locks the app fullscreen and requires the PIN to exit.
              </span>
            </span>
            <input
              type="checkbox"
              checked={settings.kioskMode}
              onChange={(e) => onToggleKiosk(e.target.checked)}
            />
          </label>
        </div>

        <HubSettingsCard
          hub={settings.hub ?? DEFAULT_HUB}
          onSave={(hub) => onSaveSettings({ ...settings, hub })}
          onTest={onHubTest}
          onPair={onHubPair}
          onSync={onHubSync}
          onDevices={onHubDevices}
          onSuggestedName={onHubSuggestedName}
        />
      </section>
    </div>
  )
}
