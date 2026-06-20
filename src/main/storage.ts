import { app } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import {
  DEFAULT_PROFILES,
  DEFAULT_PROGRESS,
  DEFAULT_SETTINGS,
  DEFAULT_USAGE
} from '../renderer/data/defaultData'
import type {
  Profile,
  ProgressData,
  Settings,
  UsageData
} from '../renderer/types'
import { HUB_DEFAULT_PORT } from '../shared/hubContract'

// Local-first JSON storage. Everything lives in Electron's userData
// directory, so each OS user gets an isolated DabbleDuck data folder.
// On first launch we seed sensible default data.

const SETTINGS_FILE = 'settings.json'
const PROFILES_FILE = 'profiles.json'
const USAGE_FILE = 'usage.json'
const PROGRESS_FILE = 'progress.json'

function dataDir(): string {
  return app.getPath('userData')
}

function filePath(name: string): string {
  return join(dataDir(), name)
}

/**
 * Read a JSON file, falling back to (and persisting) a default value
 * when the file does not exist yet, is empty, or contains invalid JSON.
 */
async function readJson<T>(name: string, fallback: T): Promise<T> {
  const path = filePath(name)
  try {
    const raw = await fs.readFile(path, 'utf-8')
    if (!raw.trim()) {
      console.warn(`[storage] ${name} is empty; re-seeding defaults`)
      await writeJson(name, fallback)
      return fallback
    }
    return JSON.parse(raw) as T
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code
    if (code === 'ENOENT') {
      await writeJson(name, fallback)
      return fallback
    }
  }
  // Corrupted JSON or other read error: heal the file and keep running.
  console.warn(`[storage] ${name} is unreadable; re-seeding defaults`)
  await writeJson(name, fallback)
  return fallback
}

/** Write a JSON file atomically so interrupted writes cannot truncate it. */
async function writeJson<T>(name: string, value: T): Promise<T> {
  const path = filePath(name)
  const tmpPath = `${path}.tmp`
  await fs.mkdir(dataDir(), { recursive: true })
  await fs.writeFile(tmpPath, JSON.stringify(value, null, 2), 'utf-8')
  await fs.rename(tmpPath, path)
  return value
}

export async function getSettings(): Promise<Settings> {
  const settings = await readJson<Settings>(SETTINGS_FILE, DEFAULT_SETTINGS)
  // Back-fill the optional Hub block for installs created before it existed,
  // so the rest of the app can rely on `settings.hub` being present.
  if (!settings.hub) {
    settings.hub = { enabled: false, address: '', port: HUB_DEFAULT_PORT }
  }
  return settings
}

export function saveSettings(settings: Settings): Promise<Settings> {
  return writeJson(SETTINGS_FILE, settings)
}

export function getProfiles(): Promise<Profile[]> {
  return readJson<Profile[]>(PROFILES_FILE, DEFAULT_PROFILES)
}

export function saveProfiles(profiles: Profile[]): Promise<Profile[]> {
  return writeJson(PROFILES_FILE, profiles)
}

export function getUsage(): Promise<UsageData> {
  return readJson<UsageData>(USAGE_FILE, DEFAULT_USAGE)
}

export function saveUsage(usage: UsageData): Promise<UsageData> {
  return writeJson(USAGE_FILE, usage)
}

export function getProgress(): Promise<ProgressData> {
  return readJson<ProgressData>(PROGRESS_FILE, DEFAULT_PROGRESS)
}

export function saveProgress(progress: ProgressData): Promise<ProgressData> {
  return writeJson(PROGRESS_FILE, progress)
}
