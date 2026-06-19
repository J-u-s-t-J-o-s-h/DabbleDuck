import { useState } from 'react'
import type { Activity } from '../types'
import type { EarnedReward } from '../services/progressService'

interface ActivityPageProps {
  activity: Activity
  /** Friendly label for the "I finished" completion button. */
  completeLabel: string
  /** Records a completion and returns any rewards newly earned. */
  onComplete: () => EarnedReward[]
  onBack: () => void
}

/**
 * A simple internal activity page for v0.1. Real apps / launchers will
 * replace the placeholder content in a future version. The "I finished"
 * action records a completion in the child's long-term progress, which can
 * unlock badges and achievements.
 */
export default function ActivityPage({
  activity,
  completeLabel,
  onComplete,
  onBack
}: ActivityPageProps): JSX.Element {
  const [completedCount, setCompletedCount] = useState(0)
  const [newRewards, setNewRewards] = useState<EarnedReward[]>([])

  const handleComplete = (): void => {
    const earned = onComplete()
    setCompletedCount((c) => c + 1)
    setNewRewards(earned)
  }

  return (
    <div className={`screen activity-page activity-page--${activity.id}`}>
      <header className="activity-page__header">
        <span className="activity-page__icon" aria-hidden="true">
          {activity.icon}
        </span>
        <div>
          <h1 className="activity-page__title">{activity.title}</h1>
          <p className="activity-page__desc">{activity.description}</p>
        </div>
      </header>

      <main className="activity-page__body">
        <div className="placeholder-card">
          <span className="duck-mascot duck-mascot--lg" aria-hidden="true">
            🦆
          </span>
          <h2>Coming soon!</h2>
          <p>
            This is where {activity.title.toLowerCase()} adventures will live.
            For now, imagine all the fun things you&apos;ll do here.
          </p>

          <button className="pill-button complete-button" type="button" onClick={handleComplete}>
            ✅ {completeLabel}
          </button>

          {completedCount > 0 && (
            <div className="celebration" role="status">
              <p className="celebration__cheer">
                🎉 Awesome! That&apos;s {completedCount}{' '}
                {completedCount === 1 ? 'time' : 'times'} today!
              </p>
              {newRewards.length > 0 && (
                <div className="celebration__rewards">
                  {newRewards.map((r) => (
                    <span className="reward-chip reward-chip--new" key={r.id}>
                      <span aria-hidden="true">{r.icon}</span> New {r.kind}:{' '}
                      {r.label}!
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <footer className="activity-page__footer">
        <button className="big-button" type="button" onClick={onBack}>
          ← Back to Home
        </button>
      </footer>
    </div>
  )
}
