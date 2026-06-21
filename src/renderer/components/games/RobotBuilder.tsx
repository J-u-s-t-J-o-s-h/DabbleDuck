import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { GameProps } from './types'
import type { EarnedReward } from '../../services/progressService'
import { audio } from '../../services/audio'

// ===========================================================================
// Robot Builder
//
// An in-process (React) game with two phases:
//   1. Build  — the child customizes a robot (color, eyes, antenna, tummy,
//               hands, feet) and can make it wave, dance, jump, and spin with
//               fun animations + sounds.
//   2. Walk   — the child walks their robot around a playground with the arrow
//               keys / WASD / on-screen pad, collecting bolts. Gathering every
//               bolt wins the round and records a completion.
//
// Everything is drawn with CSS + emoji, so the game ships no asset files and
// stays fully local-first (consistent with the rest of DabbleDuck).
// ===========================================================================

interface ColorOption {
  id: string
  label: string
  body: string
  shade: string
}

interface PartOption {
  id: string
  label: string
  emoji: string
}

interface RobotConfig {
  colorId: string
  eyesId: string
  antennaId: string
  tummyId: string
  handsId: string
  feetId: string
}

interface RobotModuleState {
  robot?: Partial<RobotConfig>
  plays?: number
  boltsCollected?: number
  lastPlayedAt?: string
}

const COLORS: ColorOption[] = [
  { id: 'blue', label: 'Blue', body: '#4da8da', shade: '#2f86b8' },
  { id: 'green', label: 'Green', body: '#6bbf59', shade: '#4e9c3f' },
  { id: 'coral', label: 'Coral', body: '#ff8c66', shade: '#e06a44' },
  { id: 'purple', label: 'Purple', body: '#a78bfa', shade: '#7c5fe0' },
  { id: 'pink', label: 'Pink', body: '#f78fb3', shade: '#d96d92' },
  { id: 'yellow', label: 'Sunny', body: '#ffd23f', shade: '#e0b21f' },
  { id: 'teal', label: 'Teal', body: '#2bb3a3', shade: '#1f8a7e' },
  { id: 'red', label: 'Red', body: '#ff6b6b', shade: '#e04848' },
  { id: 'mint', label: 'Mint', body: '#7ad9b0', shade: '#4fb98a' },
  { id: 'lavender', label: 'Lilac', body: '#c4b5fd', shade: '#9f86f0' },
  { id: 'orange', label: 'Orange', body: '#ffa94d', shade: '#e07f2a' },
  { id: 'gray', label: 'Steel', body: '#9aa7b4', shade: '#6f7d8a' }
]

const EYES: PartOption[] = [
  { id: 'round', label: 'Round', emoji: '👀' },
  { id: 'happy', label: 'Happy', emoji: '😊' },
  { id: 'star', label: 'Starry', emoji: '🤩' },
  { id: 'cool', label: 'Cool', emoji: '😎' },
  { id: 'sleepy', label: 'Sleepy', emoji: '😌' },
  { id: 'love', label: 'Love', emoji: '🥰' },
  { id: 'wink', label: 'Wink', emoji: '😉' },
  { id: 'silly', label: 'Silly', emoji: '😜' },
  { id: 'surprised', label: 'Wow', emoji: '😮' },
  { id: 'laugh', label: 'Giggle', emoji: '😄' }
]

const ANTENNAS: PartOption[] = [
  { id: 'dish', label: 'Dish', emoji: '📡' },
  { id: 'balloon', label: 'Balloon', emoji: '🎈' },
  { id: 'bolt', label: 'Spark', emoji: '⚡' },
  { id: 'flower', label: 'Flower', emoji: '🌸' },
  { id: 'hat', label: 'Top hat', emoji: '🎩' },
  { id: 'unicorn', label: 'Horn', emoji: '🦄' },
  { id: 'crown', label: 'Crown', emoji: '👑' },
  { id: 'star', label: 'Star', emoji: '⭐' },
  { id: 'bow', label: 'Bow', emoji: '🎀' },
  { id: 'fire', label: 'Fire', emoji: '🔥' }
]

const TUMMIES: PartOption[] = [
  { id: 'heart', label: 'Heart', emoji: '❤️' },
  { id: 'star', label: 'Star', emoji: '⭐' },
  { id: 'gear', label: 'Gear', emoji: '⚙️' },
  { id: 'rainbow', label: 'Rainbow', emoji: '🌈' },
  { id: 'rocket', label: 'Rocket', emoji: '🚀' },
  { id: 'music', label: 'Music', emoji: '🎵' },
  { id: 'sun', label: 'Sun', emoji: '☀️' },
  { id: 'clover', label: 'Clover', emoji: '🍀' },
  { id: 'diamond', label: 'Gem', emoji: '💎' },
  { id: 'lightning', label: 'Zap', emoji: '⚡' }
]

const HANDS: PartOption[] = [
  { id: 'wave', label: 'Wave', emoji: '👋' },
  { id: 'peace', label: 'Peace', emoji: '✌️' },
  { id: 'thumbs', label: 'Thumbs', emoji: '👍' },
  { id: 'fist', label: 'Fist', emoji: '✊' },
  { id: 'star', label: 'Star', emoji: '🌟' },
  { id: 'wrench', label: 'Wrench', emoji: '🔧' },
  { id: 'mech', label: 'Mech', emoji: '🦾' },
  { id: 'glove', label: 'Glove', emoji: '🧤' }
]

const FEET: PartOption[] = [
  { id: 'sneakers', label: 'Sneakers', emoji: '👟' },
  { id: 'boots', label: 'Boots', emoji: '🥾' },
  { id: 'skates', label: 'Skates', emoji: '🛼' },
  { id: 'wheels', label: 'Wheels', emoji: '🛞' },
  { id: 'rockets', label: 'Rockets', emoji: '🚀' },
  { id: 'cleats', label: 'Cleats', emoji: '🥿' },
  { id: 'paws', label: 'Paws', emoji: '🐾' },
  { id: 'flame', label: 'Flame', emoji: '🔥' }
]

const DEFAULT_CONFIG: RobotConfig = {
  colorId: 'blue',
  eyesId: 'round',
  antennaId: 'dish',
  tummyId: 'heart',
  handsId: 'wave',
  feetId: 'sneakers'
}

const BOLT_COUNT = 6
/** Movement speed in board-percent per animation frame (~60fps). */
const MOVE_SPEED = 0.9
/** How close (in board-percent) the robot must get to grab a bolt. */
const PICKUP_RADIUS = 9

/** Fun action animations and how long each one lasts (ms). */
type RobotAction =
  | 'idle'
  | 'pop'
  | 'wave'
  | 'dance'
  | 'jump'
  | 'spin'
const ACTION_DURATION: Record<Exclude<RobotAction, 'idle'>, number> = {
  pop: 320,
  wave: 1000,
  dance: 1600,
  jump: 650,
  spin: 800
}

interface Bolt {
  id: number
  x: number
  y: number
  got: boolean
}

function pickColor(id: string): ColorOption {
  return COLORS.find((c) => c.id === id) ?? COLORS[0]
}

function pickPart(list: PartOption[], id: string): PartOption {
  return list.find((p) => p.id === id) ?? list[0]
}

/** Scatter bolts across the playground, kept away from the very edges. */
function makeBolts(): Bolt[] {
  return Array.from({ length: BOLT_COUNT }, (_, i) => ({
    id: i,
    x: 12 + Math.random() * 76,
    y: 18 + Math.random() * 64,
    got: false
  }))
}

/** The robot itself, assembled from the chosen parts. */
function RobotFigure({
  config,
  walking,
  facing,
  action
}: {
  config: RobotConfig
  walking: boolean
  facing: 'left' | 'right'
  action: RobotAction
}): JSX.Element {
  const color = pickColor(config.colorId)
  const eyes = pickPart(EYES, config.eyesId)
  const antenna = pickPart(ANTENNAS, config.antennaId)
  const tummy = pickPart(TUMMIES, config.tummyId)
  const hands = pickPart(HANDS, config.handsId)
  const feet = pickPart(FEET, config.feetId)

  const classes = ['rb-robot']
  if (walking) classes.push('rb-robot--walking')
  if (action !== 'idle') classes.push(`rb-robot--${action}`)

  return (
    <div
      className={classes.join(' ')}
      style={
        {
          '--robot-body': color.body,
          '--robot-shade': color.shade,
          transform: facing === 'left' ? 'scaleX(-1)' : undefined
        } as React.CSSProperties
      }
    >
      <span className="rb-robot__antenna" aria-hidden="true">
        {antenna.emoji}
      </span>
      <div className="rb-robot__head">
        <span className="rb-robot__eyes" aria-hidden="true">
          {eyes.emoji}
        </span>
      </div>
      <div className="rb-robot__body">
        <span className="rb-robot__tummy" aria-hidden="true">
          {tummy.emoji}
        </span>
        <span className="rb-robot__arm rb-robot__arm--l" aria-hidden="true">
          <span className="rb-robot__hand">{hands.emoji}</span>
        </span>
        <span className="rb-robot__arm rb-robot__arm--r" aria-hidden="true">
          <span className="rb-robot__hand">{hands.emoji}</span>
        </span>
      </div>
      <div className="rb-robot__legs" aria-hidden="true">
        <span className="rb-robot__leg">
          <span className="rb-robot__foot">{feet.emoji}</span>
        </span>
        <span className="rb-robot__leg">
          <span className="rb-robot__foot">{feet.emoji}</span>
        </span>
      </div>
    </div>
  )
}

/** A row of selectable part options. */
function PartPicker({
  title,
  options,
  selectedId,
  onSelect,
  renderSwatch
}: {
  title: string
  options: Array<ColorOption | PartOption>
  selectedId: string
  onSelect: (id: string) => void
  renderSwatch?: (option: ColorOption) => JSX.Element
}): JSX.Element {
  return (
    <div className="rb-picker">
      <h2 className="rb-picker__title">{title}</h2>
      <div className="rb-picker__options">
        {options.map((option) => {
          const isColor = 'body' in option
          return (
            <button
              key={option.id}
              type="button"
              className={`rb-chip${selectedId === option.id ? ' rb-chip--on' : ''}`}
              aria-pressed={selectedId === option.id}
              aria-label={option.label}
              onClick={() => onSelect(option.id)}
            >
              {isColor && renderSwatch ? (
                renderSwatch(option as ColorOption)
              ) : (
                <span className="rb-chip__emoji" aria-hidden="true">
                  {(option as PartOption).emoji}
                </span>
              )}
              <span className="rb-chip__label">{option.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

type Phase = 'build' | 'walk' | 'win'

export default function RobotBuilder({
  onWin,
  onExit,
  moduleState,
  saveModuleState
}: GameProps): JSX.Element {
  const saved = (moduleState ?? {}) as RobotModuleState

  const [phase, setPhase] = useState<Phase>('build')
  const [config, setConfig] = useState<RobotConfig>({
    ...DEFAULT_CONFIG,
    ...(saved.robot ?? {})
  })
  const [action, setAction] = useState<RobotAction>('idle')

  const [pos, setPos] = useState({ x: 50, y: 78 })
  const [facing, setFacing] = useState<'left' | 'right'>('right')
  const [bolts, setBolts] = useState<Bolt[]>(makeBolts)
  const [rewards, setRewards] = useState<EarnedReward[]>([])

  // Live refs so the animation loop reads fresh values without re-subscribing.
  const heldKeys = useRef<Set<string>>(new Set())
  const posRef = useRef(pos)
  const boltsRef = useRef(bolts)
  const phaseRef = useRef<Phase>(phase)
  const wonRef = useRef(false)
  const actionTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    posRef.current = pos
  }, [pos])
  useEffect(() => {
    boltsRef.current = bolts
  }, [bolts])
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])
  useEffect(() => {
    return () => window.clearTimeout(actionTimer.current)
  }, [])

  const remaining = useMemo(() => bolts.filter((b) => !b.got).length, [bolts])

  /** Trigger a one-shot robot animation and clear it when it finishes. */
  const playAction = useCallback((next: Exclude<RobotAction, 'idle'>) => {
    window.clearTimeout(actionTimer.current)
    setAction(next)
    actionTimer.current = window.setTimeout(
      () => setAction('idle'),
      ACTION_DURATION[next]
    )
  }, [])

  const updateConfig = useCallback(
    (patch: Partial<RobotConfig>) => {
      audio.unlock()
      audio.pop()
      setConfig((prev) => ({ ...prev, ...patch }))
      playAction('pop')
    },
    [playAction]
  )

  /** Persist the chosen robot + a bumped play counter, then start walking. */
  const startWalking = useCallback(() => {
    audio.unlock()
    audio.menu()
    const prevPlays = Number.isFinite(saved.plays) ? (saved.plays as number) : 0
    saveModuleState({
      ...saved,
      robot: config,
      plays: prevPlays + 1,
      lastPlayedAt: new Date().toISOString()
    } satisfies RobotModuleState)
    wonRef.current = false
    setRewards([])
    setAction('idle')
    setBolts(makeBolts())
    setPos({ x: 50, y: 78 })
    setFacing('right')
    setPhase('walk')
  }, [config, saved, saveModuleState])

  const finishRound = useCallback(() => {
    if (wonRef.current) return
    wonRef.current = true
    audio.win()
    const earned = onWin()
    const prevBolts = Number.isFinite(saved.boltsCollected)
      ? (saved.boltsCollected as number)
      : 0
    saveModuleState({
      ...saved,
      robot: config,
      boltsCollected: prevBolts + BOLT_COUNT,
      lastPlayedAt: new Date().toISOString()
    } satisfies RobotModuleState)
    setRewards(earned)
    setPhase('win')
  }, [config, onWin, saved, saveModuleState])

  // --- Keyboard input (only while walking) ------------------------------
  useEffect(() => {
    if (phase !== 'walk') return
    const onDown = (e: KeyboardEvent): void => {
      const k = e.key.toLowerCase()
      if (
        ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(
          k
        )
      ) {
        e.preventDefault()
        heldKeys.current.add(k)
        audio.unlock()
      }
    }
    const onUp = (e: KeyboardEvent): void => {
      heldKeys.current.delete(e.key.toLowerCase())
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      heldKeys.current.clear()
    }
  }, [phase])

  // --- Movement + pickup loop -------------------------------------------
  useEffect(() => {
    if (phase !== 'walk') return
    let raf = 0
    let lastStepSound = 0

    const tick = (time: number): void => {
      raf = requestAnimationFrame(tick)
      if (phaseRef.current !== 'walk') return

      const keys = heldKeys.current
      let dx = 0
      let dy = 0
      if (keys.has('arrowleft') || keys.has('a')) dx -= 1
      if (keys.has('arrowright') || keys.has('d')) dx += 1
      if (keys.has('arrowup') || keys.has('w')) dy -= 1
      if (keys.has('arrowdown') || keys.has('s')) dy += 1

      if (dx === 0 && dy === 0) return

      // Normalize diagonals so the robot isn't faster going corner-to-corner.
      const len = Math.hypot(dx, dy) || 1
      const next = {
        x: Math.min(94, Math.max(6, posRef.current.x + (dx / len) * MOVE_SPEED)),
        y: Math.min(92, Math.max(10, posRef.current.y + (dy / len) * MOVE_SPEED))
      }
      posRef.current = next
      setPos(next)
      if (dx !== 0) setFacing(dx < 0 ? 'left' : 'right')

      if (time - lastStepSound > 240) {
        audio.move()
        lastStepSound = time
      }

      // Collect any bolt the robot is now standing on.
      let grabbed = false
      const updated = boltsRef.current.map((b) => {
        if (b.got) return b
        if (Math.hypot(b.x - next.x, b.y - next.y) <= PICKUP_RADIUS) {
          grabbed = true
          return { ...b, got: true }
        }
        return b
      })
      if (grabbed) {
        boltsRef.current = updated
        setBolts(updated)
        audio.sparkle()
        if (updated.every((b) => b.got)) finishRound()
      }
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase, finishRound])

  /** On-screen D-pad: press-and-hold support for touch / mouse. */
  const press = useCallback((key: string) => {
    heldKeys.current.add(key)
    audio.unlock()
  }, [])
  const release = useCallback((key: string) => {
    heldKeys.current.delete(key)
  }, [])

  /** The fun action buttons shown under the robot in the build/win screens. */
  const ActionBar = (): JSX.Element => (
    <div className="rb-actions">
      <button
        className="rb-action"
        type="button"
        onClick={() => {
          audio.unlock()
          audio.beepBoop()
          playAction('wave')
        }}
      >
        👋 Wave
      </button>
      <button
        className="rb-action"
        type="button"
        onClick={() => {
          audio.unlock()
          audio.dance()
          playAction('dance')
        }}
      >
        🕺 Dance
      </button>
      <button
        className="rb-action"
        type="button"
        onClick={() => {
          audio.unlock()
          audio.boing()
          playAction('jump')
        }}
      >
        ⭐ Jump
      </button>
      <button
        className="rb-action"
        type="button"
        onClick={() => {
          audio.unlock()
          audio.whir()
          playAction('spin')
        }}
      >
        🌀 Spin
      </button>
    </div>
  )

  // --- BUILD phase ------------------------------------------------------
  if (phase === 'build') {
    return (
      <div className="screen rb-screen rb-screen--build">
        <header className="activity-page__header">
          <span className="activity-page__icon" aria-hidden="true">
            🤖
          </span>
          <div>
            <h1 className="activity-page__title">Robot Builder</h1>
            <p className="activity-page__desc">
              Build your very own robot, make it dance, then take it for a walk!
            </p>
          </div>
        </header>

        <main className="rb-build">
          <div className="rb-stage">
            <div className="rb-stage__robot">
              <RobotFigure
                config={config}
                walking={false}
                facing="right"
                action={action}
              />
            </div>
            <ActionBar />
          </div>

          <div className="rb-controls">
            <PartPicker
              title="Color"
              options={COLORS}
              selectedId={config.colorId}
              onSelect={(id) => updateConfig({ colorId: id })}
              renderSwatch={(c) => (
                <span
                  className="rb-chip__swatch"
                  style={{ background: c.body }}
                  aria-hidden="true"
                />
              )}
            />
            <PartPicker
              title="Eyes"
              options={EYES}
              selectedId={config.eyesId}
              onSelect={(id) => updateConfig({ eyesId: id })}
            />
            <PartPicker
              title="Antenna"
              options={ANTENNAS}
              selectedId={config.antennaId}
              onSelect={(id) => updateConfig({ antennaId: id })}
            />
            <PartPicker
              title="Tummy"
              options={TUMMIES}
              selectedId={config.tummyId}
              onSelect={(id) => updateConfig({ tummyId: id })}
            />
            <PartPicker
              title="Hands"
              options={HANDS}
              selectedId={config.handsId}
              onSelect={(id) => updateConfig({ handsId: id })}
            />
            <PartPicker
              title="Feet"
              options={FEET}
              selectedId={config.feetId}
              onSelect={(id) => updateConfig({ feetId: id })}
            />
          </div>
        </main>

        <footer className="rb-footer">
          <button className="pill-button" type="button" onClick={onExit}>
            ← Back to Games
          </button>
          <button className="big-button" type="button" onClick={startWalking}>
            Let&apos;s Walk! 🚶
          </button>
        </footer>
      </div>
    )
  }

  // --- WIN phase --------------------------------------------------------
  if (phase === 'win') {
    return (
      <div className="screen rb-screen rb-screen--win">
        <div className="rb-win-robot">
          <RobotFigure
            config={config}
            walking={false}
            facing="right"
            action={action === 'idle' ? 'dance' : action}
          />
        </div>
        <h1 className="activity-page__title">You found every bolt! 🎉</h1>
        <p className="activity-page__desc">
          Great walking — your robot collected all {BOLT_COUNT} bolts!
        </p>

        {rewards.length > 0 && (
          <div className="celebration__rewards">
            {rewards.map((reward) => (
              <span className="reward-chip reward-chip--new" key={reward.id}>
                <span aria-hidden="true">{reward.icon}</span> New {reward.kind}:{' '}
                {reward.label}!
              </span>
            ))}
          </div>
        )}

        <ActionBar />

        <div className="rb-footer">
          <button
            className="pill-button"
            type="button"
            onClick={() => {
              setAction('idle')
              setPhase('build')
            }}
          >
            🛠️ Rebuild
          </button>
          <button className="big-button" type="button" onClick={startWalking}>
            Walk Again 🚶
          </button>
          <button className="pill-button" type="button" onClick={onExit}>
            ← Games
          </button>
        </div>
      </div>
    )
  }

  // --- WALK phase -------------------------------------------------------
  return (
    <div className="screen rb-screen rb-screen--walk">
      <div className="rb-walk-bar">
        <button
          className="pill-button"
          type="button"
          onClick={() => setPhase('build')}
        >
          🛠️ Build
        </button>
        <span className="rb-bolt-count">
          🔩 {BOLT_COUNT - remaining} / {BOLT_COUNT}
        </span>
        <button className="pill-button" type="button" onClick={onExit}>
          ← Games
        </button>
      </div>

      <div className="rb-field" role="img" aria-label="Robot playground">
        {bolts.map((b) =>
          b.got ? null : (
            <span
              key={b.id}
              className="rb-bolt"
              style={{ left: `${b.x}%`, top: `${b.y}%` }}
              aria-hidden="true"
            >
              🔩
            </span>
          )
        )}
        <div
          className="rb-walker"
          style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
        >
          <RobotFigure config={config} walking facing={facing} action="idle" />
        </div>
      </div>

      <div className="rb-dpad" aria-hidden="false">
        <button
          className="rb-dpad__btn rb-dpad__btn--up"
          type="button"
          aria-label="Move up"
          onPointerDown={() => press('arrowup')}
          onPointerUp={() => release('arrowup')}
          onPointerLeave={() => release('arrowup')}
        >
          ▲
        </button>
        <button
          className="rb-dpad__btn rb-dpad__btn--left"
          type="button"
          aria-label="Move left"
          onPointerDown={() => press('arrowleft')}
          onPointerUp={() => release('arrowleft')}
          onPointerLeave={() => release('arrowleft')}
        >
          ◀
        </button>
        <button
          className="rb-dpad__btn rb-dpad__btn--right"
          type="button"
          aria-label="Move right"
          onPointerDown={() => press('arrowright')}
          onPointerUp={() => release('arrowright')}
          onPointerLeave={() => release('arrowright')}
        >
          ▶
        </button>
        <button
          className="rb-dpad__btn rb-dpad__btn--down"
          type="button"
          aria-label="Move down"
          onPointerDown={() => press('arrowdown')}
          onPointerUp={() => release('arrowdown')}
          onPointerLeave={() => release('arrowdown')}
        >
          ▼
        </button>
      </div>
    </div>
  )
}
