import type { Activity } from '../types'

interface ActivityCardProps {
  activity: Activity
  onClick: () => void
}

/** A large, friendly, rounded card representing one activity section. */
export default function ActivityCard({
  activity,
  onClick
}: ActivityCardProps): JSX.Element {
  return (
    <button
      className={`activity-card activity-card--${activity.id}`}
      onClick={onClick}
      type="button"
    >
      <span className="activity-card__icon" aria-hidden="true">
        {activity.icon}
      </span>
      <span className="activity-card__title">{activity.title}</span>
      <span className="activity-card__desc">{activity.description}</span>
    </button>
  )
}
