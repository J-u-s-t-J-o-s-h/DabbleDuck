import { useState } from 'react'

interface ParentPinModalProps {
  correctPin: string
  onCancel: () => void
  onSuccess: () => void
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back']

/**
 * A simple numeric PIN pad guarding Parent Mode. Access is denied unless
 * the entered PIN matches the stored parent PIN.
 */
export default function ParentPinModal({
  correctPin,
  onCancel,
  onSuccess
}: ParentPinModalProps): JSX.Element {
  const [entry, setEntry] = useState('')
  const [error, setError] = useState(false)

  const handleKey = (key: string): void => {
    setError(false)
    if (key === 'clear') {
      setEntry('')
      return
    }
    if (key === 'back') {
      setEntry((prev) => prev.slice(0, -1))
      return
    }
    if (entry.length >= 8) return

    const next = entry + key
    setEntry(next)

    if (next.length >= correctPin.length) {
      if (next === correctPin) {
        onSuccess()
      } else {
        setError(true)
        setEntry('')
      }
    }
  }

  return (
    <div className="screen screen--center pin-screen">
      <div className="pin-card">
        <span className="duck-mascot" aria-hidden="true">
          🔒
        </span>
        <h2>Parent Mode</h2>
        <p className="pin-card__hint">Enter the parent PIN to continue.</p>

        <div className="pin-dots" aria-live="polite">
          {entry.length === 0 && !error ? (
            <span className="pin-dots__placeholder">• • • •</span>
          ) : (
            entry.split('').map((_, i) => (
              <span key={i} className="pin-dot pin-dot--filled" />
            ))
          )}
        </div>

        {error && <p className="pin-error">That PIN wasn&apos;t right. Try again.</p>}

        <div className="pin-pad">
          {KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className={`pin-key ${
                key === 'clear' || key === 'back' ? 'pin-key--action' : ''
              }`}
              onClick={() => handleKey(key)}
            >
              {key === 'back' ? '⌫' : key === 'clear' ? 'C' : key}
            </button>
          ))}
        </div>

        <button className="link-button" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
