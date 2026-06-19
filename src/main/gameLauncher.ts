import { spawn, spawnSync } from 'child_process'
import { existsSync, readdirSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import {
  ARG_CONTRACT,
  ARG_SESSION,
  CONTRACT_VERSION,
  type GameManifest
} from '../shared/gameContract'

// ===========================================================================
// Game process launcher.
//
// Spawns a standalone game as a SEPARATE process, hands it the session folder
// on the command line, and resolves when it exits. This is the cross-process
// boundary that keeps the launcher isolated from game crashes/leaks.
// ===========================================================================

export interface SpawnSpec {
  command: string
  args: string[]
  cwd: string
  env: NodeJS.ProcessEnv
}

export interface ProcessExit {
  code: number | null
  signal: NodeJS.Signals | null
}

function scanDirForGodotExe(dir: string): string | null {
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

function findGodotOnPath(): string | null {
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

/**
 * Locate an installed Godot binary (DEV ONLY, for runtime "godot"). Honors the
 * DABBLE_GODOT_BIN env override, then common install locations (including
 * WinGet on Windows), then PATH via `where` / `which`.
 */
export function findGodotBin(): string | null {
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
  ].filter((c): c is string => Boolean(c))

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }
  return findGodotOnPath()
}

/** @deprecated Use findGodotBin — kept for callers that expect a string. */
export function resolveGodotBin(): string {
  return findGodotBin() ?? 'godot'
}

/**
 * Check whether a game manifest can be launched on this machine before we spawn.
 */
export function validateGameLaunch(
  manifest: GameManifest,
  gameDir: string
): { ok: true } | { ok: false; error: string } {
  if (manifest.runtime === 'node') {
    if (!manifest.entry) {
      return {
        ok: false,
        error: `Game "${manifest.id}" is missing an entry script.`
      }
    }
    const entryPath = join(gameDir, manifest.entry)
    if (!existsSync(entryPath)) {
      return {
        ok: false,
        error: `Game "${manifest.id}" entry file is missing.`
      }
    }
    return { ok: true }
  }

  if (manifest.runtime === 'godot') {
    const bin = findGodotBin()
    if (!bin) {
      return {
        ok: false,
        error:
          'Godot is not installed. On Windows run: winget install GodotEngine.GodotEngine — then restart DabbleDuck. See docs/godot-development.md.'
      }
    }
    if (!existsSync(join(gameDir, 'project.godot'))) {
      return {
        ok: false,
        error: `Game "${manifest.id}" is missing its Godot project.`
      }
    }
    return { ok: true }
  }

  const exe = manifest.executables?.[process.platform]
  if (!exe) {
    return {
      ok: false,
      error: `Game "${manifest.id}" is not available on ${process.platform}.`
    }
  }
  const exePath = join(gameDir, exe)
  if (!existsSync(exePath)) {
    return {
      ok: false,
      error: `Game "${manifest.id}" has not been built for this platform yet.`
    }
  }
  return { ok: true }
}

/**
 * Resolve how to start a game from its manifest.
 *  - "node":   run the entry script with the current runtime (Electron/Node).
 *              Used by the Phase 2 placeholder game.
 *  - "godot":  run the Godot project via an installed Godot binary (dev only).
 *  - "native": run the platform-specific exported executable (production).
 */
export function resolveSpawnSpec(
  manifest: GameManifest,
  gameDir: string,
  sessionDir: string
): SpawnSpec {
  const contractArgs = [
    ARG_SESSION,
    sessionDir,
    ARG_CONTRACT,
    String(CONTRACT_VERSION)
  ]

  if (manifest.runtime === 'node') {
    if (!manifest.entry) {
      throw new Error(`Game "${manifest.id}" has runtime "node" but no entry`)
    }
    return {
      command: process.execPath,
      args: [join(gameDir, manifest.entry), ...contractArgs],
      cwd: gameDir,
      // ELECTRON_RUN_AS_NODE makes the Electron binary behave as plain Node,
      // so the placeholder script runs without spinning up a Chromium window.
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
    }
  }

  if (manifest.runtime === 'godot') {
    const bin = findGodotBin()
    if (!bin) {
      throw new Error(
        'Godot is not installed. Run: winget install GodotEngine.GodotEngine (see docs/godot-development.md).'
      )
    }
    // `godot --path <project> -- <user args>`. The DabbleSDK reads the args
    // after `--` as user args.
    return {
      command: bin,
      args: ['--path', gameDir, '--', ...contractArgs],
      cwd: gameDir,
      env: { ...process.env }
    }
  }

  const exe = manifest.executables?.[process.platform]
  if (!exe) {
    throw new Error(
      `Game "${manifest.id}" has no executable for platform "${process.platform}"`
    )
  }
  return {
    command: join(gameDir, exe),
    args: contractArgs,
    cwd: gameDir,
    env: { ...process.env }
  }
}

/** Spawn a game process and resolve when it exits. */
export function launchProcess(spec: SpawnSpec): Promise<ProcessExit> {
  return new Promise((resolve, reject) => {
    const child = spawn(spec.command, spec.args, {
      cwd: spec.cwd,
      env: spec.env,
      stdio: ['ignore', 'pipe', 'pipe']
    })

    child.stdout?.on('data', (chunk: Buffer) => {
      process.stdout.write(`[game:out] ${chunk.toString()}`)
    })
    child.stderr?.on('data', (chunk: Buffer) => {
      process.stderr.write(`[game:err] ${chunk.toString()}`)
    })

    child.on('error', (err) => reject(err))
    child.on('close', (code, signal) => resolve({ code, signal }))
  })
}
