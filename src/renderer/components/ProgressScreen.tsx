import type { Activity, ChildProgress, Profile } from '../types'
import {
  deriveMilestones,
  recentAccomplishments
} from '../services/progressService'

interface ProgressScreenProps {
  profile: Profile
  progress: ChildProgress
  activities: Activity[]
  onBack: () => void
}

/**
 * The child's celebratory progress screen. Encouraging and positive — no
 * leaderboards, rankings, or competition. Just "look how far you've come".
 */
export default function ProgressScreen({
  profile,
  progress,
  activities,
  onBack
}: ProgressScreenProps): JSX.Element {
  const activityLabel = (id: string): string =>
    activities.find((a) => a.id === id)?.title ?? id
  const activityIcon = (id: string): string =>
    activities.find((a) => a.id === id)?.icon ?? '⭐'

  const milestones = deriveMilestones(progress)
  const recent = recentAccomplishments(progress, 6)
  const topMilestone = milestones[0]

  return (
    <div className="screen progress-screen">
      <header className="progress-hero">
        <span className="duck-mascot duck-mascot--lg" aria-hidden="true">
          🦆
        </span>
        <div>
          <h1>Great job, {profile.name}!</h1>
          <p className="progress-hero__cheer">
            {topMilestone
              ? `You've ${topMilestone.label.toLowerCase()}: ${topMilestone.value}! Keep it up!`
              : 'Your DabbleDuck adventure is just beginning!'}
          </p>
        </div>
      </header>

      {/* Summary stats */}
      <section className="progress-summary">
        <div className="summary-tile">
          <span className="summary-tile__value">{progress.streak.currentDays}</span>
          <span className="summary-tile__label">🔥 day streak</span>
        </div>
        <div className="summary-tile">
          <span className="summary-tile__value">{progress.badges.length}</span>
          <span className="summary-tile__label">🏅 badges</span>
        </div>
        <div className="summary-tile">
          <span className="summary-tile__value">
            {progress.achievements.length}
          </span>
          <span className="summary-tile__label">⭐ achievements</span>
        </div>
        <div className="summary-tile">
          <span className="summary-tile__value">
            {Math.round(progress.lifetimeMinutes / 60)}
          </span>
          <span className="summary-tile__label">⏱️ hours of fun</span>
        </div>
      </section>

      {/* Badges */}
      <section className="progress-block">
        <h2>Your Badges</h2>
        {progress.badges.length === 0 ? (
          <p className="encourage">
            Play and learn to earn your very first badge!
          </p>
        ) : (
          <div className="reward-grid">
            {progress.badges.map((badge) => (
              <div className="reward-chip reward-chip--badge" key={badge.id}>
                <span className="reward-chip__icon" aria-hidden="true">
                  {badge.icon}
                </span>
                <span className="reward-chip__label">{badge.label}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Achievements */}
      <section className="progress-block">
        <h2>Achievement Collection</h2>
        {progress.achievements.length === 0 ? (
          <p className="encourage">New achievements are waiting for you!</p>
        ) : (
          <div className="reward-grid">
            {progress.achievements.map((ach) => (
              <div className="reward-chip reward-chip--achievement" key={ach.id}>
                <span className="reward-chip__icon" aria-hidden="true">
                  {ach.icon}
                </span>
                <span className="reward-chip__label">{ach.label}</span>
                <span className="reward-chip__desc">{ach.description}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent accomplishments */}
      {recent.length > 0 && (
        <section className="progress-block">
          <h2>Recent Accomplishments</h2>
          <ul className="recent-list">
            {recent.map((r) => (
              <li key={`${r.kind}-${r.id}`}>
                <span aria-hidden="true">{r.icon}</span> You earned the{' '}
                <strong>{r.label}</strong>{' '}
                {r.kind === 'badge' ? 'Badge' : 'Achievement'}!
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Streaks + favorites */}
      <section className="progress-block progress-block--row">
        <div className="mini-card">
          <h3>Your Streak</h3>
          <p>
            You're on a <strong>{progress.streak.currentDays}-day</strong> streak!
          </p>
          <p className="muted small">
            Longest ever: {progress.streak.longestDays} days
          </p>
        </div>
        <div className="mini-card">
          <h3>Favorite Activities</h3>
          {progress.favoriteActivities.length === 0 ? (
            <p className="muted small">Try a few activities to find favorites!</p>
          ) : (
            <div className="fav-row">
              {progress.favoriteActivities.map((id) => (
                <span className="fav-chip" key={id}>
                  {activityIcon(id)} {activityLabel(id)}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      <footer className="progress-footer">
        <button className="big-button" type="button" onClick={onBack}>
          ← Back to Home
        </button>
      </footer>
    </div>
  )
}
