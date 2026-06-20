#!/usr/bin/env node
// Render a Godot game to a PNG so we can review visuals without playing by hand.
// Launches Godot windowed (NOT headless, so the GPU renders), captures the
// viewport after a few frames, and exits.
//
// Usage:
//   node tools/godot-screenshot.mjs [outPath] [--game <id>] [options]
//
// Common options:
//   --game <id>     which games/<id> project (default: mouse-maze-3d)
//   --level <N>     load level N
//   --steps <K>     run the snake autopilot for K frames (slither-trail)
//   --move          take one step (mouse-maze-3d)
//   --dir u|d|l|r   face/move a direction (mouse-maze-3d)
//   --char <name>   pick a character (mouse-maze-3d)
//   --picker        show the character picker (mouse-maze-3d)
//   --advance       test the level-transition path (mouse-maze-3d)

import { spawnSync } from 'node:child_process'
import { join, isAbsolute } from 'node:path'
import { mkdirSync } from 'node:fs'
import { findGodotBin } from './godot-resolve.mjs'

const GODOT = findGodotBin()
if (!GODOT) {
  console.error('Godot not found. Set DABBLE_GODOT_BIN or install Godot.')
  process.exit(1)
}

function flagValue(flag) {
  const i = process.argv.indexOf(flag)
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : null
}

const game = flagValue('--game') ?? 'mouse-maze-3d'
const projectDir = join(process.cwd(), 'games', game)

const VALUE_FLAGS = new Set(['--game', '--dir', '--level', '--steps', '--char'])
const argOut = process.argv
  .slice(2)
  .find((a, i, arr) => !a.startsWith('--') && !VALUE_FLAGS.has(arr[i - 1]))
const out = argOut
  ? isAbsolute(argOut)
    ? argOut
    : join(process.cwd(), argOut)
  : join(process.cwd(), '.verify-tmp', `${game}.png`)
mkdirSync(join(process.cwd(), '.verify-tmp'), { recursive: true })

const userArgs = ['--dabble-screenshot', out]
if (process.argv.includes('--move')) userArgs.push('--dabble-shot-move')
const dir = flagValue('--dir')
if (dir) userArgs.push('--dabble-shot-dir', dir)
const lvl = flagValue('--level')
if (lvl) userArgs.push('--dabble-shot-level', lvl)
const steps = flagValue('--steps')
if (steps) userArgs.push('--dabble-shot-steps', steps)
if (process.argv.includes('--advance')) userArgs.push('--dabble-shot-advance')
const char = flagValue('--char')
if (char) userArgs.push('--dabble-shot-char', char)
if (process.argv.includes('--picker')) userArgs.push('--dabble-shot-picker')
if (process.argv.includes('--diff')) userArgs.push('--dabble-shot-diff')

const args = ['--path', projectDir, '--resolution', '1280x720', '--', ...userArgs]
console.log(`Rendering: ${GODOT} ${args.join(' ')}`)
const run = spawnSync(GODOT, args, { encoding: 'utf-8', timeout: 60000 })
if (run.stdout) console.log(run.stdout.trim())
if (run.stderr && run.stderr.trim()) console.log('[stderr]', run.stderr.trim())
console.log(`\nScreenshot -> ${out}`)
