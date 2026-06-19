import { spawn } from 'child_process'
import { existsSync } from 'fs'
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

/**
 * Locate an installed Godot binary (DEV ONLY, for runtime "godot"). Honors the
 * DABBLE_GODOT_BIN env override, then common install locations, then PATH.
 */
export function resolveGodotBin(): string {
  const candidates = [
    process.env.DABBLE_GODOT_BIN,
    '/opt/homebrew/bin/godot',
    '/usr/local/bin/godot',
    '/usr/bin/godot',
    '/Applications/Godot.app/Contents/MacOS/Godot'
  ].filter((c): c is string => Boolean(c))
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }
  // Fall back to PATH resolution.
  return 'godot'
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
    // `godot --path <project> -- <user args>`. The DabbleSDK reads the args
    // after `--` as user args.
    return {
      command: resolveGodotBin(),
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
