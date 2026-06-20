import { useState } from 'react'
import type {
  HubClientSettings,
  HubPairResult,
  HubSyncResult,
  HubTestResult
} from '../types'

interface HubSettingsCardProps {
  hub: HubClientSettings
  /** Persist edited Hub settings (enabled / address / port). */
  onSave: (hub: HubClientSettings) => void
  onTest: () => Promise<HubTestResult>
  onPair: (deviceName: string) => Promise<HubPairResult>
  onSync: () => Promise<HubSyncResult>
}

/**
 * Optional Family Hub settings. The Hub is never required: DabbleDuck works
 * fully offline and standalone when this is disabled or unreachable.
 */
export default function HubSettingsCard({
  hub,
  onSave,
  onTest,
  onPair,
  onSync
}: HubSettingsCardProps): JSX.Element {
  const [deviceName, setDeviceName] = useState('DabbleDuck Device')
  const [busy, setBusy] = useState<null | 'test' | 'pair' | 'sync'>(null)
  const [message, setMessage] = useState<string | null>(null)

  const paired = Boolean(hub.deviceId && hub.deviceToken)

  const update = (patch: Partial<HubClientSettings>): void => {
    onSave({ ...hub, ...patch })
  }

  const handleTest = async (): Promise<void> => {
    setBusy('test')
    setMessage(null)
    const res = await onTest()
    setBusy(null)
    setMessage(
      res.ok
        ? `Connected to "${res.hubName}" (protocol v${res.protocolVersion}).`
        : `Connection failed: ${res.error}`
    )
  }

  const handlePair = async (): Promise<void> => {
    setBusy('pair')
    setMessage(null)
    const res = await onPair(deviceName.trim() || 'DabbleDuck Device')
    setBusy(null)
    setMessage(
      res.ok ? 'Device paired with the Hub.' : `Pairing failed: ${res.error}`
    )
  }

  const handleSync = async (): Promise<void> => {
    setBusy('sync')
    setMessage(null)
    const res = await onSync()
    setBusy(null)
    setMessage(
      res.ok
        ? `Sync complete: ${res.pushedProfiles} up, ${res.pulledProfiles} down.`
        : `Sync failed: ${res.error}`
    )
  }

  return (
    <div className="settings-card">
      <h2>Family Hub (optional)</h2>
      <p className="muted small">
        Connect to a DabbleDuck Hub on your home network to back up and share
        profiles, progress, and creations. DabbleDuck works fully without it.
      </p>

      <label className="switch-row">
        <span>
          <strong>Enable Hub</strong>
          <br />
          <span className="muted small">
            When off, DabbleDuck never contacts the network.
          </span>
        </span>
        <input
          type="checkbox"
          checked={hub.enabled}
          onChange={(e) => update({ enabled: e.target.checked })}
        />
      </label>

      <label className="text-field">
        <span>Hub address (IP or hostname)</span>
        <input
          type="text"
          value={hub.address}
          placeholder="e.g. 192.168.1.20"
          disabled={!hub.enabled}
          onChange={(e) => update({ address: e.target.value })}
        />
      </label>

      <label className="text-field">
        <span>Hub port</span>
        <input
          type="number"
          min={1}
          max={65535}
          value={hub.port}
          disabled={!hub.enabled}
          onChange={(e) =>
            update({ port: Math.max(1, Math.min(65535, Number(e.target.value) || 0)) })
          }
        />
      </label>

      <label className="text-field">
        <span>This device&apos;s name (for pairing)</span>
        <input
          type="text"
          value={deviceName}
          disabled={!hub.enabled || paired}
          onChange={(e) => setDeviceName(e.target.value)}
        />
      </label>

      <div className="profile-row__actions">
        <button
          className="pill-button"
          type="button"
          disabled={!hub.enabled || busy !== null}
          onClick={handleTest}
        >
          {busy === 'test' ? 'Testing…' : 'Test connection'}
        </button>
        <button
          className="pill-button"
          type="button"
          disabled={!hub.enabled || paired || busy !== null}
          onClick={handlePair}
        >
          {busy === 'pair' ? 'Pairing…' : paired ? 'Paired ✓' : 'Pair device'}
        </button>
        <button
          className="pill-button"
          type="button"
          disabled={!hub.enabled || !paired || busy !== null}
          onClick={handleSync}
        >
          {busy === 'sync' ? 'Syncing…' : 'Sync now'}
        </button>
      </div>

      {message && <p className="pin-message">{message}</p>}

      <p className="muted small">
        Status: {hub.lastSyncStatus ?? 'Never synced'}
        {hub.lastSyncAt
          ? ` · ${new Date(hub.lastSyncAt).toLocaleString()}`
          : ''}
      </p>
    </div>
  )
}
