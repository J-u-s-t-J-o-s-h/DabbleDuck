import type { Activity, Profile, ProgressData } from '../types'
import {
  deriveMilestones,
  ensureProgress,
  mostUsedActivities
} from '../services/progressService'

interface ParentProgressPanelProps {
  profiles: Profile[]
  progress: ProgressData
  activities: Activity[]
}

function formatLifetime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins} min`
  return `${hours}h ${mins}m`
}

/**
 * Parent-facing growth analytics per child. Shows lifetime usage, completion
 * milestones, badges, achievements, streaks, favorites, and most-used
 * activities. Read-only and non-competitive by design.
 */
export default function ParentProgressPanel({
  profiles,
  progress,
  activities
}: ParentProgressPanelProps): JSX.Element {
  const activityLabel = (id: string): string =>
    activities.find((a) => a.id === id)?.title ?? id
  const activityIcon = (id: string): string =>
    activities.find((a) => a.id === id)?.icon ?? '⭐'

  return (
    <div className="progress-panel">
      {profiles.map((profile) => {
        const p = ensureProgress(progress, profile.id)
        const milestones = deriveMilestones(p)
        const topActivities = mostUsedActivities(p, 5)
        const books = p.completions['books'] ?? 0
        const stories = p.completions['stories'] ?? 0

        return (
          <div className="progress-panel__child" key={profile.id}>
            <div className="progress-panel__head">
              <span
                className="profile-row__avatar"
                style={{ backgroundColor: profile.color }}
                aria-hidden="true"
              >
                {profile.icon}
              </span>
              <div>
                <strong>{profile.name}</strong>
                <div className="muted small">
                  First used: {p.streak.firstUseDate ?? '—'}
                </div>
              </div>
            </div>

            <div className="progress-panel__stats">
              <div className="stat">
                <span className="stat__value">
                  {formatLifetime(p.lifetimeMinutes)}
                </span>
                <span className="stat__label">lifetime usage</span>
              </div>
              <div className="stat">
                <span className="stat__value">{books}</span>
                <span className="stat__label">books completed</span>
              </div>
              <div className="stat">
                <span className="stat__value">{stories}</span>
                <span className="stat__label">stories completed</span>
              </div>
              <div className="stat">
                <span className="stat__value">{p.streak.currentDays}</span>
                <span className="stat__label">current streak</span>
              </div>
              <div className="stat">
                <span className="stat__value">{p.badges.length}</span>
                <span className="stat__label">badges earned</span>
              </div>
              <div className="stat">
                <span className="stat__value">{p.achievements.length}</span>
                <span className="stat__label">achievements</span>
              </div>
            </div>

            <div className="progress-panel__cols">
              <div className="progress-panel__col">
                <h4>Badges earned</h4>
                {p.badges.length === 0 ? (
                  <span className="muted small">None yet</span>
                ) : (
                  <div className="chip-wrap">
                    {p.badges.map((b) => (
                      <span className="count-chip" key={b.id}>
                        {b.icon} {b.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="progress-panel__col">
                <h4>Achievements earned</h4>
                {p.achievements.length === 0 ? (
                  <span className="muted small">None yet</span>
                ) : (
                  <div className="chip-wrap">
                    {p.achievements.map((a) => (
                      <span className="count-chip" key={a.id} title={a.description}>
                        {a.icon} {a.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="progress-panel__col">
                <h4>Favorite activities</h4>
                {p.favoriteActivities.length === 0 ? (
                  <span className="muted small">Not enough data yet</span>
                ) : (
                  <div className="chip-wrap">
                    {p.favoriteActivities.map((id) => (
                      <span className="count-chip" key={id}>
                        {activityIcon(id)} {activityLabel(id)}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="progress-panel__col">
                <h4>Most used activities</h4>
                {topActivities.length === 0 ? (
                  <span className="muted small">Not enough data yet</span>
                ) : (
                  <div className="chip-wrap">
                    {topActivities.map((a) => (
                      <span className="count-chip" key={a.id}>
                        {activityIcon(a.id)} {activityLabel(a.id)} · {a.count}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="progress-panel__milestones">
              <h4>Learning milestones</h4>
              {milestones.length === 0 ? (
                <span className="muted small">No milestones recorded yet</span>
              ) : (
                <div className="chip-wrap">
                  {milestones.map((m) => (
                    <span className="milestone-chip" key={m.id}>
                      {m.icon} {m.label}: <strong>{m.value}</strong>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
