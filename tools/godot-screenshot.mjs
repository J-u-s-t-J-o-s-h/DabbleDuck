#!/usr/bin/env node
// Render the mouse-maze-3d game to a PNG so we can review visuals without
// playing by hand. Launches Godot windowed (NOT headless, so the GPU renders),
// captures the viewport after a few frames, and exits.
//
// Usage:
//   node tools/godot-screenshot.mjs [outPath] [--move]
//
// Default outPath: .verify-tmp/mouse-maze-3d.png

import { spawnSync } from 'node:child_process'
import { join, isAbsolute } from 'node:path'
import { mkdirSync } from 'node:fs'
import { findGodotBin } from './godot-resolve.mjs'

const GODOT = findGodotBin()
if (!GODOT) {
  console.error('Godot not found. Set DABBLE_GODOT_BIN or install Godot.')
  process.exit(1)
}

const projectDir = join(process.cwd(), 'games', 'mouse-maze-3d')
const argOut = process.argv.find((a, i) => i >= 2 && !a.startsWith('--'))
const out = argOut
  ? (isAbsolute(argOut) ? argOut : join(process.cwd(), argOut))
  : join(process.cwd(), '.verify-tmp', 'mouse-maze-3d.png')
mkdirSync(join(process.cwd(), '.verify-tmp'), { recursive: true })

const userArgs = ['--dabble-screenshot', out]
if (process.argv.includes('--move')) userArgs.push('--dabble-shot-move')
const dirIdx = process.argv.indexOf('--dir')
if (dirIdx >= 0 && process.argv[dirIdx + 1]) {
  userArgs.push('--dabble-shot-dir', process.argv[dirIdx + 1])
}
const lvlIdx = process.argv.indexOf('--level')
if (lvlIdx >= 0 && process.argv[lvlIdx + 1]) {
  userArgs.push('--dabble-shot-level', process.argv[lvlIdx + 1])
}
if (process.argv.includes('--advance')) userArgs.push('--dabble-shot-advance')
const charIdx = process.argv.indexOf('--char')
if (charIdx >= 0 && process.argv[charIdx + 1]) {
  userArgs.push('--dabble-shot-char', process.argv[charIdx + 1])
}
if (process.argv.includes('--picker')) userArgs.push('--dabble-shot-picker')

const args = ['--path', projectDir, '--resolution', '1280x720', '--', ...userArgs]
console.log(`Rendering: ${GODOT} ${args.join(' ')}`)
const run = spawnSync(GODOT, args, { encoding: 'utf-8', timeout: 60000 })
if (run.stdout) console.log(run.stdout.trim())
if (run.stderr && run.stderr.trim()) console.log('[stderr]', run.stderr.trim())
console.log(`\nScreenshot -> ${out}`)
