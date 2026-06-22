import { useState } from 'react'
import type { Profile } from '../types'

// ===========================================================================
// Profile Management Portal
//
// Parent-facing UI to add, edit, and remove child profiles. Lives inside the
// Parent Dashboard and persists through the existing profiles API.
// ===========================================================================

const AVATAR_ICONS = [
  '🦊', '🐢', '🐻', '🐰', '🦁', '🐼', '🐨', '🐸',
  '🦄', '🐙', '🦋', '🐝', '🐱', '🐶', '🦉', '🐧',
  '🦆', '🐳', '🦖', '🚀', '⭐', '🌈', '🎨', '🎮'
]

const AVATAR_COLORS = [
  '#FFD23F', '#4DA8DA', '#6BBF59', '#FF8C66', '#A78BFA', '#F78FB3',
  '#2BB3A3', '#FF6B6B', '#7AD9B0', '#FFA94D', '#C4B5FD', '#9AA7B4'
]

const DEFAULT_DAILY_LIMIT = 60
const DEFAULT_AGE = 5

type FormMode = 'closed' | 'add' | 'edit'

interface ProfileDraft {
  name: string
  age: number
  icon: string
  color: string
  dailyLimitMinutes: number
}

interface ProfileManagementPortalProps {
  profiles: Profile[]
  onSaveProfiles: (profiles: Profile[]) => void
  onDeleteProfile: (profileId: string) => void
}

function newProfileId(name: string, existingIds: Set<string>): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'kid'
  let id = `${base}-${crypto.randomUUID().slice(0, 8)}`
  while (existingIds.has(id)) {
    id = `${base}-${crypto.randomUUID().slice(0, 8)}`
  }
  return id
}

function blankDraft(): ProfileDraft {
  return {
    name: '',
    age: DEFAULT_AGE,
    icon: AVATAR_ICONS[0],
    color: AVATAR_COLORS[0],
    dailyLimitMinutes: DEFAULT_DAILY_LIMIT
  }
}

function draftFromProfile(profile: Profile): ProfileDraft {
  return {
    name: profile.name,
    age: profile.age,
    icon: profile.icon,
    color: profile.color,
    dailyLimitMinutes: profile.dailyLimitMinutes
  }
}

function validateDraft(draft: ProfileDraft): string | null {
  const name = draft.name.trim()
  if (!name) return 'Please enter a name.'
  if (name.length > 24) return 'Name must be 24 characters or fewer.'
  if (!Number.isFinite(draft.age) || draft.age < 3 || draft.age > 18) {
    return 'Age must be between 3 and 18.'
  }
  if (
    !Number.isFinite(draft.dailyLimitMinutes) ||
    draft.dailyLimitMinutes < 0 ||
    draft.dailyLimitMinutes > 600
  ) {
    return 'Daily limit must be between 0 and 600 minutes.'
  }
  return null
}

export default function ProfileManagementPortal({
  profiles,
  onSaveProfiles,
  onDeleteProfile
}: ProfileManagementPortalProps): JSX.Element {
  const [mode, setMode] = useState<FormMode>('closed')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ProfileDraft>(blankDraft)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Profile | null>(null)

  const openAdd = (): void => {
    setMode('add')
    setEditingId(null)
    setDraft(blankDraft())
    setFormError(null)
    setSuccessMessage(null)
  }

  const openEdit = (profile: Profile): void => {
    setMode('edit')
    setEditingId(profile.id)
    setDraft(draftFromProfile(profile))
    setFormError(null)
  }

  const closeForm = (): void => {
    setMode('closed')
    setEditingId(null)
    setDraft(blankDraft())
    setFormError(null)
  }

  const handleSave = (): void => {
    const error = validateDraft(draft)
    if (error) {
      setFormError(error)
      return
    }

    const trimmedName = draft.name.trim()
    const nextProfile: Profile = {
      id:
        mode === 'edit' && editingId
          ? editingId
          : newProfileId(trimmedName, new Set(profiles.map((p) => p.id))),
      name: trimmedName,
      age: Math.round(draft.age),
      icon: draft.icon,
      color: draft.color,
      dailyLimitMinutes: Math.round(draft.dailyLimitMinutes)
    }

    const next =
      mode === 'edit' && editingId
        ? profiles.map((p) => (p.id === editingId ? nextProfile : p))
        : [...profiles, nextProfile]

    onSaveProfiles(next)
    const successMsg =
      mode === 'edit'
        ? `${trimmedName}'s profile was updated.`
        : `${trimmedName} was added!`
    closeForm()
    setSuccessMessage(successMsg)
  }

  const confirmDelete = (): void => {
    if (!pendingDelete) return
    onDeleteProfile(pendingDelete.id)
    setPendingDelete(null)
    if (editingId === pendingDelete.id) closeForm()
  }

  return (
    <section className="dashboard-section profile-portal">
      <div className="profile-portal__header">
        <div>
          <h2>Manage Profiles</h2>
          <p className="profile-portal__subtitle">
            Add, edit, or remove child profiles for your family.
          </p>
        </div>
        <button className="big-button" type="button" onClick={openAdd}>
          + Add a Child
        </button>
      </div>

      {successMessage && (
        <p className="profile-portal__message">{successMessage}</p>
      )}

      <div className="profile-portal__grid">
        {profiles.map((profile) => (
          <article className="profile-portal__card" key={profile.id}>
            <span
              className="profile-portal__avatar"
              style={{ backgroundColor: profile.color }}
              aria-hidden="true"
            >
              {profile.icon}
            </span>
            <div className="profile-portal__info">
              <strong>{profile.name}</strong>
              <span className="muted small">
                Age {profile.age} · {profile.dailyLimitMinutes} min/day
              </span>
            </div>
            <div className="profile-portal__card-actions">
              <button
                className="pill-button"
                type="button"
                onClick={() => openEdit(profile)}
              >
                Edit
              </button>
              <button
                className="pill-button pill-button--ghost pill-button--danger"
                type="button"
                disabled={profiles.length <= 1}
                onClick={() => setPendingDelete(profile)}
              >
                Remove
              </button>
            </div>
          </article>
        ))}
      </div>

      {profiles.length <= 1 && (
        <p className="muted small profile-portal__hint">
          At least one child profile is required.
        </p>
      )}

      {mode !== 'closed' && (
        <div
          className="profile-portal__overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-form-title"
        >
          <div className="profile-portal__form-card">
            <h3 id="profile-form-title">
              {mode === 'add' ? 'Add a Child' : 'Edit Profile'}
            </h3>

            <div className="profile-portal__preview">
              <span
                className="profile-portal__preview-avatar"
                style={{ backgroundColor: draft.color }}
                aria-hidden="true"
              >
                {draft.icon}
              </span>
              <span className="profile-portal__preview-name">
                {draft.name.trim() || 'New friend'}
              </span>
            </div>

            <label className="text-field">
              <span>Name</span>
              <input
                type="text"
                maxLength={24}
                value={draft.name}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Child's name"
                autoFocus
              />
            </label>

            <label className="text-field">
              <span>Age</span>
              <input
                type="number"
                min={3}
                max={18}
                value={draft.age}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    age: Number(e.target.value) || DEFAULT_AGE
                  }))
                }
              />
            </label>

            <label className="text-field">
              <span>Daily screen time (minutes)</span>
              <input
                type="number"
                min={0}
                max={600}
                value={draft.dailyLimitMinutes}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    dailyLimitMinutes: Number(e.target.value) || 0
                  }))
                }
              />
            </label>

            <div className="profile-portal__picker">
              <span className="profile-portal__picker-label">Avatar icon</span>
              <div className="profile-portal__icon-grid">
                {AVATAR_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    className={`profile-portal__icon-btn${
                      draft.icon === icon ? ' profile-portal__icon-btn--on' : ''
                    }`}
                    aria-pressed={draft.icon === icon}
                    aria-label={`Icon ${icon}`}
                    onClick={() => setDraft((prev) => ({ ...prev, icon }))}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="profile-portal__picker">
              <span className="profile-portal__picker-label">Avatar color</span>
              <div className="profile-portal__color-grid">
                {AVATAR_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`profile-portal__color-btn${
                      draft.color === color ? ' profile-portal__color-btn--on' : ''
                    }`}
                    style={{ backgroundColor: color }}
                    aria-pressed={draft.color === color}
                    aria-label={`Color ${color}`}
                    onClick={() => setDraft((prev) => ({ ...prev, color }))}
                  />
                ))}
              </div>
            </div>

            {formError && <p className="profile-portal__form-error">{formError}</p>}

            <div className="profile-portal__form-actions">
              <button className="pill-button" type="button" onClick={closeForm}>
                Cancel
              </button>
              <button className="big-button" type="button" onClick={handleSave}>
                {mode === 'add' ? 'Add Profile' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingDelete && (
        <div
          className="profile-portal__overlay"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-profile-title"
        >
          <div className="profile-portal__form-card profile-portal__form-card--confirm">
            <h3 id="delete-profile-title">Remove {pendingDelete.name}?</h3>
            <p className="muted">
              This will delete their profile and remove their usage and progress
              data from this device. This cannot be undone.
            </p>
            <div className="profile-portal__form-actions">
              <button
                className="pill-button"
                type="button"
                onClick={() => setPendingDelete(null)}
              >
                Keep Profile
              </button>
              <button
                className="big-button profile-portal__delete-btn"
                type="button"
                onClick={confirmDelete}
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
