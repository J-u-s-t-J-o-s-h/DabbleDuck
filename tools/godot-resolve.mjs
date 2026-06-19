// ===========================================================================
// Shared Godot binary resolution (Node tools + documentation reference).
// Keep in sync with findGodotBin() in src/main/gameLauncher.ts.
// ===========================================================================
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

function scanDirForGodotExe(dir) {
  if (!existsSync(dir)) return null
  try {
    for (const name of readdirSync(dir)) {
      if (/^Godot.*\.exe$/i.test(name)) {
        const path = join(dir, name)
        if (existsSync(path)) return path
      }
    }
  } catch {
    /* ignore */
  }
  return null
}

function findOnPath() {
  const cmd = process.platform === 'win32' ? 'where' : 'which'
  try {
    const run = spawnSync(cmd, ['godot'], {
      encoding: 'utf-8',
      windowsHide: true
    })
    if (run.status !== 0 || !run.stdout?.trim()) return null
    const first = run.stdout.trim().split(/\r?\n/)[0]?.trim()
    return first && existsSync(first) ? first : null
  } catch {
    return null
  }
}

/** Resolve the Godot executable for dev workflows and verification. */
export function findGodotBin() {
  const localAppData = process.env.LOCALAPPDATA
  const programFiles = process.env['ProgramFiles']

  const candidates = [
    process.env.DABBLE_GODOT_BIN,
    localAppData
      ? join(localAppData, 'Microsoft', 'WinGet', 'Links', 'godot.exe')
      : null,
    localAppData
      ? join(localAppData, 'Programs', 'Godot', 'Godot.exe')
      : null,
    programFiles ? scanDirForGodotExe(join(programFiles, 'Godot')) : null,
    '/opt/homebrew/bin/godot',
    '/usr/local/bin/godot',
    '/usr/bin/godot',
    '/Applications/Godot.app/Contents/MacOS/Godot',
    join(homedir(), 'Godot', 'Godot.exe')
  ].filter((c) => Boolean(c))

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }
  return findOnPath()
}
