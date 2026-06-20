// ===========================================================================
// Verify the REAL Godot game speaks the DabbleDuck contract.
//
// Runs the actual Godot binary headlessly against a synthetic session folder
// with --dabble-autowin, then asserts the game wrote the expected events +
// result. This proves the GDScript DabbleSDK <-> launcher contract end to end
// without needing GUI input.
//
// Run with:  npm run verify:godot
// ===========================================================================
import { spawnSync } from 'node:child_process'
import { promises as fs, existsSync } from 'node:fs'
import { join } from 'node:path'
import { findGodotBin } from './godot-resolve.mjs'

const GODOT = findGodotBin()

const projectDir = join(
  process.cwd(),
  'games',
  process.env.DABBLE_GODOT_GAME ?? 'mouse-maze-3d'
)
const sessionDir = join(process.cwd(), '.verify-tmp', 'godot-verify')

let failures = 0
function check(label, condition) {
  console.log(`  [${condition ? 'PASS' : 'FAIL'}] ${label}`)
  if (!condition) failures += 1
}

async function main() {
  if (!GODOT) {
    console.error(
      'Godot not found. Install with: winget install GodotEngine.GodotEngine\n' +
        'Or set DABBLE_GODOT_BIN to your Godot.exe path.'
    )
    process.exit(1)
  }
  console.log(`Godot: ${GODOT}`)
  console.log(`Project: ${projectDir}\n`)

  await fs.rm(sessionDir, { recursive: true, force: true })
  await fs.mkdir(sessionDir, { recursive: true })

  const launch = {
    contractVersion: 1,
    sessionId: 'godot-verify',
    game: { id: 'mouse-maze-3d', version: '0.1.0' },
    profile: { id: 'addie', name: 'Addie', age: 6, color: '#FF8FB1', icon: '🦊' },
    settings: { soundEnabled: true, locale: 'en-US', reducedMotion: false },
    session: { remainingSeconds: 3600, startedAt: new Date().toISOString() },
    moduleState: null
  }
  await fs.writeFile(
    join(sessionDir, 'launch.json'),
    JSON.stringify(launch, null, 2)
  )
  // Pre-create the event log (mirrors what the launcher does).
  await fs.writeFile(join(sessionDir, 'events.ndjson'), '')

  const args = [
    '--headless',
    '--path',
    projectDir,
    '--',
    '--dabble-session',
    sessionDir,
    '--dabble-contract',
    '1',
    '--dabble-autowin'
  ]
  console.log(`Running: ${GODOT} ${args.join(' ')}\n`)
  const run = spawnSync(GODOT, args, { encoding: 'utf-8', timeout: 60000 })

  if (run.stdout) console.log(run.stdout.trim())
  if (run.stderr && run.stderr.trim()) console.log('[stderr]', run.stderr.trim())
  console.log('')

  check('godot exited with code 0', run.status === 0)

  const rawEvents = await fs
    .readFile(join(sessionDir, 'events.ndjson'), 'utf-8')
    .catch(() => '')
  const events = rawEvents
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l))
  const rawResult = await fs
    .readFile(join(sessionDir, 'result.json'), 'utf-8')
    .catch(() => null)
  const result = rawResult ? JSON.parse(rawResult) : null

  check('game emitted at least 4 events', events.length >= 4)
  check(
    'emitted activity.visit (play)',
    events.some((e) => e.type === 'activity.visit' && e.activityId === 'play')
  )
  check(
    'emitted completion games=1',
    events.some(
      (e) =>
        e.type === 'completion' && e.completionType === 'games' && e.amount === 1
    )
  )
  check(
    'requested badge maze-first-cheese',
    events.some(
      (e) => e.type === 'badge.request' && e.badge?.id === 'maze-first-cheese'
    )
  )
  check(
    'saved module.state with plays',
    events.some(
      (e) => e.type === 'module.state' && typeof e.state?.plays === 'number'
    )
  )
  check('wrote result.json completedCleanly', result?.completedCleanly === true)

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
