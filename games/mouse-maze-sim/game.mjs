#!/usr/bin/env node
// ===========================================================================
// DabbleDuck placeholder game — Phase 2 vertical-slice stand-in for a real
// Godot 4 export. It does NOT contain gameplay; it exists only to PROVE the
// cross-process platform contract end to end.
//
// A real Godot game would do exactly this via a `DabbleSDK.gd` autoload:
//   1. read the session folder + launch.json handed to it on the command line
//   2. play (here: simulated instantly)
//   3. append progress events to events.ndjson
//   4. write result.json and exit cleanly
//
// Contract: see src/shared/gameContract.ts (kept in sync by hand, exactly as a
// GDScript SDK would have to be).
// ===========================================================================
import { readFileSync, appendFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const CONTRACT_VERSION = 1
const ARG_SESSION = '--dabble-session'
const LAUNCH_FILE = 'launch.json'
const EVENTS_FILE = 'events.ndjson'
const RESULT_FILE = 'result.json'

const args = process.argv.slice(2)
function argValue(flag) {
  const i = args.indexOf(flag)
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null
}

const sessionDir = argValue(ARG_SESSION)
if (!sessionDir) {
  console.error('[game] missing --dabble-session argument')
  process.exit(2)
}

const launchPath = join(sessionDir, LAUNCH_FILE)
const eventsPath = join(sessionDir, EVENTS_FILE)
const resultPath = join(sessionDir, RESULT_FILE)

let launch
try {
  launch = JSON.parse(readFileSync(launchPath, 'utf-8'))
} catch (err) {
  console.error('[game] cannot read launch context:', err)
  process.exit(3)
}

const nowIso = () => new Date().toISOString()

/** Append one newline-delimited JSON event and flush immediately. */
function emit(event) {
  appendFileSync(eventsPath, `${JSON.stringify({ t: nowIso(), ...event })}\n`, 'utf-8')
}

const childName = launch?.profile?.name ?? 'friend'
const gameId = launch?.game?.id ?? 'unknown'
console.log(
  `[game] Hello ${childName}! Starting "${gameId}" (session ${launch?.sessionId}).`
)

// --- "Play" the game (simulated) ------------------------------------------
emit({ type: 'activity.visit', activityId: launch?.game?.section ?? 'play' })
emit({ type: 'game.event', name: 'mouse-maze.demo.started' })

const prev =
  launch?.moduleState && typeof launch.moduleState === 'object'
    ? launch.moduleState
    : {}
const plays = Number.isFinite(prev.plays) ? prev.plays + 1 : 1

emit({ type: 'completion', completionType: 'games', amount: 1 })
emit({ type: 'game.event', name: 'mouse-maze.demo.completed', data: { cheese: 1 } })
emit({
  type: 'badge.request',
  badge: { id: 'maze-first-cheese', label: 'First Cheese!', icon: '🧀' }
})
const moduleState = { plays, lastPlayedAt: nowIso() }
emit({ type: 'module.state', state: moduleState })

// --- Finish: write result.json and exit cleanly ---------------------------
const result = {
  contractVersion: CONTRACT_VERSION,
  sessionId: launch?.sessionId ?? null,
  completedCleanly: true,
  summary: { completions: { games: 1 }, moduleState }
}
writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf-8')

console.log('[game] Done — returning to DabbleDuck.')
process.exit(0)
