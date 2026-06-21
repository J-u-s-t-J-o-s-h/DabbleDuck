import { contextBridge, ipcRenderer } from 'electron'
import type {
  DabbleApi,
  GameLaunchRequest,
  Profile,
  ProgressData,
  Settings,
  UsageData
} from '../renderer/types'

// Expose a small, explicit, type-safe API to the renderer.
// The renderer never touches Node or the filesystem directly.
const api: DabbleApi = {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: Settings) =>
    ipcRenderer.invoke('settings:save', settings),
  getProfiles: () => ipcRenderer.invoke('profiles:get'),
  saveProfiles: (profiles: Profile[]) =>
    ipcRenderer.invoke('profiles:save', profiles),
  getUsage: () => ipcRenderer.invoke('usage:get'),
  saveUsage: (usage: UsageData) => ipcRenderer.invoke('usage:save', usage),
  getProgress: () => ipcRenderer.invoke('progress:get'),
  saveProgress: (progress: ProgressData) =>
    ipcRenderer.invoke('progress:save', progress),
  setKiosk: (enabled: boolean) => ipcRenderer.invoke('kiosk:set', enabled),
  requestExit: (pin: string) => ipcRenderer.invoke('app:requestExit', pin),
  launchGame: (req: GameLaunchRequest) =>
    ipcRenderer.invoke('game:launch', req),
  hubTest: () => ipcRenderer.invoke('hub:test'),
  hubPair: (deviceName: string) => ipcRenderer.invoke('hub:pair', deviceName),
  hubSync: () => ipcRenderer.invoke('hub:sync'),
  hubDevices: () => ipcRenderer.invoke('hub:devices'),
  hubSuggestedName: () => ipcRenderer.invoke('hub:suggestedName')
}

contextBridge.exposeInMainWorld('dabble', api)
