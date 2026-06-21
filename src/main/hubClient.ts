import { getProfiles, getProgress, getSettings, saveSettings } from './storage'
import {
  DEVICE_TOKEN_HEADER,
  type DevicesResponse,
  type HubInfo,
  type PairResponse,
  type SyncPullResponse,
  type SyncPushResponse
} from '../shared/hubContract'
import type {
  HubClientSettings,
  HubDevicesResult,
  HubPairResult,
  HubSyncResult,
  HubTestResult,
  Settings
} from '../renderer/types'

// ===========================================================================
// Optional Hub client (main process).
//
// All functions are FAILURE-SAFE: any network/Hub problem returns a structured
// { ok:false, error } result and never throws. The launcher works exactly as
// before when the Hub is disabled, unreachable, or unpaired.
//
// Phase 1 sync is conservative: it PUSHES local snapshots to the Hub and
// retrieves family data, but does NOT overwrite local data from the pull, so a
// Hub round-trip can never clobber a child's local progress.
// ===========================================================================

const REQUEST_TIMEOUT_MS = 5000

function activeHub(settings: Settings): HubClientSettings | null {
  const hub = settings.hub
  if (!hub || !hub.enabled) return null
  if (!hub.address.trim()) return null
  return hub
}

function baseUrl(hub: HubClientSettings): string {
  return `http://${hub.address.trim()}:${hub.port}`
}

function describeError(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === 'AbortError') return 'Connection timed out'
    return err.message
  }
  return String(err)
}

async function fetchJson<T>(
  url: string,
  init: RequestInit
): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(url, { ...init, signal: controller.signal })
    if (!res.ok) {
      throw new Error(`Hub responded with HTTP ${res.status}`)
    }
    return (await res.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

/** Verify the configured Hub is reachable and speaks a compatible protocol. */
export async function hubTest(): Promise<HubTestResult> {
  const settings = await getSettings()
  const hub = activeHub(settings)
  if (!hub) {
    return { ok: false, error: 'Hub is disabled or no address is set.' }
  }
  try {
    const info = await fetchJson<HubInfo>(`${baseUrl(hub)}/hub/info`, {
      method: 'GET'
    })
    return {
      ok: true,
      hubName: info.name,
      protocolVersion: info.protocolVersion
    }
  } catch (err) {
    return { ok: false, error: describeError(err) }
  }
}

/** Pair this device with the Hub and persist the returned device token. */
export async function hubPair(deviceName: string): Promise<HubPairResult> {
  const settings = await getSettings()
  const hub = activeHub(settings)
  if (!hub) {
    return { ok: false, error: 'Hub is disabled or no address is set.' }
  }
  try {
    const res = await fetchJson<PairResponse>(
      `${baseUrl(hub)}/devices/pair`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ deviceName })
      }
    )
    const nextSettings: Settings = {
      ...settings,
      hub: { ...hub, deviceId: res.deviceId, deviceToken: res.deviceToken }
    }
    await saveSettings(nextSettings)
    return { ok: true, deviceId: res.deviceId }
  } catch (err) {
    return { ok: false, error: describeError(err) }
  }
}

/** List the devices currently paired with the Hub (for the Connected Devices view). */
export async function hubDevices(): Promise<HubDevicesResult> {
  const settings = await getSettings()
  const hub = activeHub(settings)
  if (!hub) {
    return { ok: false, error: 'Hub is disabled or no address is set.' }
  }
  if (!hub.deviceToken) {
    return { ok: false, error: 'This device is not paired with the Hub yet.' }
  }
  try {
    const res = await fetchJson<DevicesResponse>(
      `${baseUrl(hub)}/devices`,
      {
        method: 'GET',
        headers: { [DEVICE_TOKEN_HEADER]: hub.deviceToken }
      }
    )
    return { ok: true, devices: res.devices }
  } catch (err) {
    return { ok: false, error: describeError(err) }
  }
}

/** Push local snapshots to the Hub, then pull family data (non-destructive). */
export async function hubSync(): Promise<HubSyncResult> {
  const settings = await getSettings()
  const hub = activeHub(settings)
  if (!hub) {
    return { ok: false, error: 'Hub is disabled or no address is set.' }
  }
  if (!hub.deviceToken) {
    return { ok: false, error: 'This device is not paired with the Hub yet.' }
  }

  const persistStatus = async (status: string): Promise<void> => {
    const latest = await getSettings()
    if (!latest.hub) return
    await saveSettings({
      ...latest,
      hub: { ...latest.hub, lastSyncStatus: status, lastSyncAt: new Date().toISOString() }
    }).catch(() => undefined)
  }

  try {
    const [profiles, progressData] = await Promise.all([
      getProfiles(),
      getProgress()
    ])

    const url = baseUrl(hub)
    await fetchJson<SyncPushResponse>(`${url}/sync/push`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        [DEVICE_TOKEN_HEADER]: hub.deviceToken
      },
      body: JSON.stringify({
        deviceId: hub.deviceId,
        profiles,
        progress: Object.values(progressData),
        artifacts: []
      })
    })

    const pull = await fetchJson<SyncPullResponse>(`${url}/sync/pull`, {
      method: 'GET',
      headers: { [DEVICE_TOKEN_HEADER]: hub.deviceToken }
    })

    const status = `Synced ${profiles.length} profile(s) up, ${pull.profiles.length} down.`
    await persistStatus(status)
    return {
      ok: true,
      pushedProfiles: profiles.length,
      pulledProfiles: pull.profiles.length,
      cursor: pull.cursor
    }
  } catch (err) {
    const message = describeError(err)
    await persistStatus(`Sync failed: ${message}`)
    return { ok: false, error: message }
  }
}
