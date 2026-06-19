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
 * when the file does not exist yet or is corrupted.
 */
async function readJson<T>(name: string, fallback: T): Promise<T> {
  const path = filePath(name)
  try {
    const raw = await fs.readFile(path, 'utf-8')
    return JSON.parse(raw) as T
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code
    if (code === 'ENOENT') {
      // First launch for this file: seed the default and return it.
      await writeJson(name, fallback)
      return fallback
    }
    // Corrupted JSON or other read error: keep the user running with
    // defaults rather than crashing the app.
    console.error(`[storage] Failed to read ${name}, using fallback:`, err)
    return fallback
  }
}

/** Write a JSON file, creating the data directory if needed. */
async function writeJson<T>(name: string, value: T): Promise<T> {
  const path = filePath(name)
  await fs.mkdir(dataDir(), { recursive: true })
  await fs.writeFile(path, JSON.stringify(value, null, 2), 'utf-8')
  return value
}

export function getSettings(): Promise<Settings> {
  return readJson<Settings>(SETTINGS_FILE, DEFAULT_SETTINGS)
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
