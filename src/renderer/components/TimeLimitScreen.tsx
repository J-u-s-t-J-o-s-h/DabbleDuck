import type { Profile } from '../types'

interface TimeLimitScreenProps {
  profile: Profile | null
  onParentMode: () => void
  onBackToProfiles: () => void
}

/**
 * The friendly daily-limit lock screen. A parent can unlock more time
 * from the dashboard after entering the PIN.
 */
export default function TimeLimitScreen({
  profile,
  onParentMode,
  onBackToProfiles
}: TimeLimitScreenProps): JSX.Element {
  return (
    <div className="screen screen--center limit-screen">
      <div className="limit-card">
        <span className="duck-mascot duck-mascot--lg sleeping" aria-hidden="true">
          🦆
        </span>
        <h1>DabbleDuck is resting for today.</h1>
        <p>
          {profile ? `Great job today, ${profile.name}! ` : ''}
          You&apos;ve used all your screen time. See you next time!
        </p>
        <div className="limit-actions">
          <button className="big-button" type="button" onClick={onBackToProfiles}>
            Back to Profiles
          </button>
          <button className="link-button" type="button" onClick={onParentMode}>
            Parent Mode
          </button>
        </div>
      </div>
    </div>
  )
}
