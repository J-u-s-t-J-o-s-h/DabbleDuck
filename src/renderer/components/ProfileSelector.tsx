import type { Profile } from '../types'

interface ProfileSelectorProps {
  profiles: Profile[]
  onSelect: (profileId: string) => void
  onParentMode: () => void
}

/**
 * The launch screen. Children pick their profile to enter their
 * personalized DabbleDuck clubhouse.
 */
export default function ProfileSelector({
  profiles,
  onSelect,
  onParentMode
}: ProfileSelectorProps): JSX.Element {
  return (
    <div className="screen screen--center profile-selector">
      <header className="brand">
        <span className="duck-mascot duck-mascot--lg" aria-hidden="true">
          🦆
        </span>
        <h1 className="brand__name">DabbleDuck</h1>
        <p className="brand__tagline">Who&apos;s here to play and learn today?</p>
      </header>

      <div className="profile-grid">
        {profiles.map((profile) => (
          <button
            key={profile.id}
            className="profile-card"
            type="button"
            onClick={() => onSelect(profile.id)}
          >
            <span
              className="profile-card__avatar"
              style={{ backgroundColor: profile.color }}
              aria-hidden="true"
            >
              {profile.icon}
            </span>
            <span className="profile-card__name">{profile.name}</span>
            <span className="profile-card__age">Age {profile.age}</span>
          </button>
        ))}
      </div>

      <button className="link-button parent-link" type="button" onClick={onParentMode}>
        Parent Mode
      </button>
    </div>
  )
}
