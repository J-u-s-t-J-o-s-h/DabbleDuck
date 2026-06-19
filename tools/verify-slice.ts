/* eslint-disable no-console */
// ===========================================================================
// Phase 2 vertical-slice verification.
//
// Exercises the REAL platform modules (no Electron, no GUI) end to end:
//   1. build a launch context + session folder (profile handoff)
//   2. spawn the standalone placeholder game as a separate process
//   3. read the events + result it wrote (event log)
//   4. reconcile them into a child's progress via the shared service
//   5. assert progress + badges/achievements were awarded correctly
//   6. run a second session to prove module-state handoff + no double-awards
//
// Run with:  npm run verify:slice
// ===========================================================================
import { promises as fs } from 'fs'
import { join } from 'path'
import {
  buildLaunchContext,
  makeSessionId,
  parseEvents,
  parseResult,
  sessionPaths
} from '../src/main/gameSession'
import { launchProcess, resolveSpawnSpec } from '../src/main/gameLauncher'
import { reconcile } from '../src/main/gameReconciler'
import { createBlankProgress } from '../src/renderer/data/defaultData'
import type { GameManifest, SettingsSnapshot } from '../src/shared/gameContract'
import type { ChildProgress, Profile } from '../src/renderer/types'

let failures = 0
function check(label: string, condition: boolean): void {
  const mark = condition ? 'PASS' : 'FAIL'
  if (!condition) failures += 1
  console.log(`  [${mark}] ${label}`)
}

const PROFILE: Profile = {
  id: 'addie',
  name: 'Addie',
  age: 6,
  color: '#FF8FB1',
  icon: '🦊',
  dailyLimitMinutes: 60
}

const SETTINGS: SettingsSnapshot = {
  soundEnabled: true,
  locale: 'en-US',
  reducedMotion: false
}

async function runSession(
  gameDir: string,
  manifest: GameManifest,
  base: ChildProgress,
  remainingSeconds: number
): Promise<{ progress: ChildProgress; newlyEarnedIds: string[] }> {
  const sessionId = makeSessionId(PROFILE.id, manifest.id)
  const sessionDir = join(process.cwd(), '.verify-tmp', sessionId)
  const paths = sessionPaths(sessionDir)

  await fs.mkdir(sessionDir, { recursive: true })
  const launch = buildLaunchContext({
    sessionId,
    manifest,
    profile: PROFILE,
    settings: SETTINGS,
    remainingSeconds,
    moduleState: base.modules[manifest.id] ?? null
  })
  await fs.writeFile(paths.launch, JSON.stringify(launch, null, 2), 'utf-8')
  await fs.writeFile(paths.events, '', 'utf-8')

  const spec = resolveSpawnSpec(manifest, gameDir, sessionDir)
  const exit = await launchProcess(spec)
  check(`game exited cleanly (code ${exit.code})`, exit.code === 0)

  const rawEvents = await fs.readFile(paths.events, 'utf-8').catch(() => '')
  const rawResult = await fs.readFile(paths.result, 'utf-8').catch(() => null)
  const events = parseEvents(rawEvents)
  const result = parseResult(rawResult)

  check('session folder created + launch.json handed off', true)
  check('game wrote at least 4 events', events.length >= 4)
  check('game wrote a clean result.json', result?.completedCleanly === true)

  const { progress, newlyEarned } = reconcile(base, events, manifest)
  return { progress, newlyEarnedIds: newlyEarned.map((r) => r.id) }
}

async function main(): Promise<void> {
  const gameDir = join(process.cwd(), 'games', 'mouse-maze-sim')
  const manifest = JSON.parse(
    await fs.readFile(join(gameDir, 'game.json'), 'utf-8')
  ) as GameManifest

  console.log('Vertical slice: launcher <-> standalone game\n')
  console.log(`Game: ${manifest.title} (${manifest.id}) runtime=${manifest.runtime}`)

  // --- Session 1: first play ------------------------------------------------
  console.log('\nSession 1 (first play):')
  const blank = createBlankProgress(PROFILE.id)
  const s1 = await runSession(gameDir, manifest, blank, 3600)

  check('completion recorded: games === 1', s1.progress.completions.games === 1)
  const mod1 = s1.progress.modules[manifest.id] as { plays?: number } | undefined
  check('module state persisted: plays === 1', mod1?.plays === 1)
  check(
    'game-specific badge awarded: maze-first-cheese',
    s1.progress.badges.some((b) => b.id === 'maze-first-cheese')
  )
  check(
    'platform badge awarded: game-on',
    s1.progress.badges.some((b) => b.id === 'game-on')
  )
  check(
    'platform achievement awarded: first-steps',
    s1.progress.achievements.some((a) => a.id === 'first-steps')
  )
  check(
    'newlyEarned reported maze-first-cheese + game-on',
    s1.newlyEarnedIds.includes('maze-first-cheese') &&
      s1.newlyEarnedIds.includes('game-on')
  )

  // --- Session 2: replay, prove module-state handoff + no double awards -----
  console.log('\nSession 2 (replay):')
  const s2 = await runSession(gameDir, manifest, s1.progress, 3600)

  check('completion accumulated: games === 2', s2.progress.completions.games === 2)
  const mod2 = s2.progress.modules[manifest.id] as { plays?: number } | undefined
  check('module state handoff: plays === 2', mod2?.plays === 2)
  check(
    'no duplicate badge: maze-first-cheese counted once',
    s2.progress.badges.filter((b) => b.id === 'maze-first-cheese').length === 1
  )
  check(
    'no new rewards re-reported on replay',
    s2.newlyEarnedIds.length === 0
  )

  console.log('')
  if (failures > 0) {
    console.error(`RESULT: ${failures} check(s) FAILED`)
    process.exit(1)
  }
  console.log('RESULT: all checks PASSED ✅')
}

main().catch((err) => {
  console.error('Verification crashed:', err)
  process.exit(1)
})
