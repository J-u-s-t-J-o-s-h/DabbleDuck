import type { Activity, ActivityId, Profile, UsageRecord } from '../types'
import ActivityCard from './ActivityCard'

interface HomeScreenProps {
  profile: Profile
  usage: UsageRecord
  activities: Activity[]
  allowedActivities: Record<ActivityId, boolean>
  onOpenActivity: (activityId: ActivityId) => void
  onOpenProgress: () => void
  onExit: () => void
  onParentMode: () => void
}

function minutesLeft(profile: Profile, usage: UsageRecord): number {
  const used = Math.floor(usage.secondsUsedToday / 60)
  return Math.max(0, profile.dailyLimitMinutes - used)
}

/**
 * The personalized child home screen: a greeting plus a grid of large,
 * friendly activity cards (only the ones the parent has enabled).
 */
export default function HomeScreen({
  profile,
  usage,
  activities,
  allowedActivities,
  onOpenActivity,
  onOpenProgress,
  onExit,
  onParentMode
}: HomeScreenProps): JSX.Element {
  const visibleActivities = activities.filter(
    (activity) => allowedActivities[activity.id]
  )
  const remaining = minutesLeft(profile, usage)

  return (
    <div className="screen home-screen">
      <header className="home-header">
        <div className="home-header__greeting">
          <span className="duck-mascot" aria-hidden="true">
            🦆
          </span>
          <div>
            <h1 className="home-header__title">Hi, {profile.name}!</h1>
            <p className="home-header__subtitle">
              Welcome to your DabbleDuck clubhouse.
            </p>
          </div>
        </div>
        <div className="home-header__meta">
          <span className="time-pill" title="Time left today">
            ⏰ {remaining} min left
          </span>
          <button
            className="pill-button pill-button--progress"
            type="button"
            onClick={onOpenProgress}
          >
            ⭐ My Progress
          </button>
          <button className="pill-button" type="button" onClick={onExit}>
            Switch Kid
          </button>
        </div>
      </header>

      {visibleActivities.length === 0 ? (
        <p className="empty-note">
          No activities are turned on yet. Ask a grown-up to enable some in
          Parent Mode.
        </p>
      ) : (
        <main className="activity-grid">
          {visibleActivities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              onClick={() => onOpenActivity(activity.id)}
            />
          ))}
        </main>
      )}

      <footer className="home-footer">
        <button className="link-button" type="button" onClick={onParentMode}>
          Parent Mode
        </button>
      </footer>
    </div>
  )
}
