import { useCallback, useEffect, useState } from 'react'
import type {
  DeviceSummary,
  HubClientSettings,
  HubDevicesResult,
  HubPairResult,
  HubSyncResult,
  HubTestResult
} from '../types'

const FALLBACK_DEVICE_NAME = 'DabbleDuck Device'
/** A device counts as "online" if it was last seen within this window. */
const ONLINE_WINDOW_MS = 5 * 60 * 1000

interface HubSettingsCardProps {
  hub: HubClientSettings
  /** Persist edited Hub settings (enabled / address / port). */
  onSave: (hub: HubClientSettings) => void
  onTest: () => Promise<HubTestResult>
  onPair: (deviceName: string) => Promise<HubPairResult>
  onSync: () => Promise<HubSyncResult>
  onDevices: () => Promise<HubDevicesResult>
  /** Suggested default device name (from the local machine hostname). */
  onSuggestedName: () => Promise<string>
}

function deviceIsOnline(device: DeviceSummary): boolean {
  if (!device.lastSeen) return false
  return Date.now() - new Date(device.lastSeen).getTime() < ONLINE_WINDOW_MS
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
  onSync,
  onDevices,
  onSuggestedName
}: HubSettingsCardProps): JSX.Element {
  const [deviceName, setDeviceName] = useState(FALLBACK_DEVICE_NAME)
  const [nameEdited, setNameEdited] = useState(false)
  const [busy, setBusy] = useState<null | 'test' | 'pair' | 'sync'>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [devices, setDevices] = useState<DeviceSummary[] | null>(null)
  const [devicesError, setDevicesError] = useState<string | null>(null)
  const [loadingDevices, setLoadingDevices] = useState(false)

  const paired = Boolean(hub.deviceId && hub.deviceToken)

  const update = (patch: Partial<HubClientSettings>): void => {
    onSave({ ...hub, ...patch })
  }

  // Auto-populate a suggested device name from the machine hostname, unless the
  // parent has already typed one or this device is already paired.
  useEffect(() => {
    if (nameEdited || paired) return
    let cancelled = false
    onSuggestedName()
      .then((suggested) => {
        if (!cancelled && suggested && !nameEdited) setDeviceName(suggested)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [onSuggestedName, nameEdited, paired])

  const loadDevices = useCallback(async (): Promise<void> => {
    setLoadingDevices(true)
    setDevicesError(null)
    const res = await onDevices()
    setLoadingDevices(false)
    if (res.ok) {
      setDevices(res.devices ?? [])
    } else {
      setDevices(null)
      setDevicesError(res.error ?? 'Could not load devices.')
    }
  }, [onDevices])

  // Load the connected-devices list once the device is paired.
  useEffect(() => {
    if (hub.enabled && paired) void loadDevices()
  }, [hub.enabled, paired, loadDevices])

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
    const res = await onPair(deviceName.trim() || FALLBACK_DEVICE_NAME)
    setBusy(null)
    setMessage(
      res.ok ? 'Device paired with the Hub.' : `Pairing failed: ${res.error}`
    )
    if (res.ok) void loadDevices()
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
    if (res.ok) void loadDevices()
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
          placeholder="e.g. Addie's MacBook"
          disabled={!hub.enabled || paired}
          onChange={(e) => {
            setNameEdited(true)
            setDeviceName(e.target.value)
          }}
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

      {hub.enabled && paired && (
        <div className="hub-devices">
          <div className="hub-devices__header">
            <strong>Connected devices</strong>
            <button
              className="pill-button pill-button--ghost"
              type="button"
              disabled={loadingDevices}
              onClick={() => void loadDevices()}
            >
              {loadingDevices ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          {devicesError && <p className="pin-message">{devicesError}</p>}

          {!devicesError && devices && devices.length === 0 && (
            <p className="muted small">No devices paired yet.</p>
          )}

          {!devicesError && devices && devices.length > 0 && (
            <ul className="hub-devices__list">
              {devices.map((device) => {
                const online = deviceIsOnline(device)
                const isThisDevice = device.id === hub.deviceId
                return (
                  <li className="hub-devices__item" key={device.id}>
                    <span
                      className={`hub-devices__dot ${
                        online ? 'hub-devices__dot--online' : ''
                      }`}
                      aria-hidden="true"
                    />
                    <span className="hub-devices__name">
                      {device.name?.trim() || FALLBACK_DEVICE_NAME}
                      {isThisDevice ? ' (this device)' : ''}
                    </span>
                    <span className="muted small">
                      {online ? 'Online' : 'Offline'}
                      {device.lastSeen
                        ? ` · last sync ${new Date(
                            device.lastSeen
                          ).toLocaleString()}`
                        : ' · never synced'}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
