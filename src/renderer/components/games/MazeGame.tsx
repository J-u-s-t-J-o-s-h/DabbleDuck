import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { GameProps } from './types'
import type { EarnedReward } from '../../services/progressService'
import { audio } from '../../services/audio'
import { LEVELS, SPRITES, THEMES, type MazeLevel } from './mazeLevels'

// ===========================================================================
// Mouse Maze
//
// A friendly, replayable maze game. Children guide a lovable mouse through
// themed mazes (garden, forest, castle, moonlight) to find the cheese.
//
// - Randomly generated solvable mazes (recursive backtracking).
// - Themed, textured rendering on an HTML5 <canvas> with decorations.
// - Smooth, animated, expressive mouse (idle breathing, walk hop/squash,
//   happy victory dance) via a delta-time requestAnimationFrame loop.
// - Confetti, sound effects, gentle music, and celebratory feedback.
// - Multiple unlockable levels of increasing size/difficulty.
// - Stats (mazes completed, cheeses, best times, levels) persist into the
//   child's DabbleDuck progress via the game's module state.
// - No failure states: only encouragement.
// ===========================================================================

type Direction = 'up' | 'down' | 'left' | 'right'

interface Cell {
  top: boolean
  right: boolean
  bottom: boolean
  left: boolean
}
type Grid = Cell[][]

interface MazeStats {
  unlockedLevels: number
  completedLevels: string[]
  mazesCompleted: number
  totalCheeses: number
  bestTimes: Record<string, number>
}

interface Confetto {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  vr: number
  size: number
  color: string
  life: number
}

const EASE = 14 // mouse glide speed
const CONFETTI_COLORS = [
  '#FFD23F',
  '#4DA8DA',
  '#6BBF59',
  '#FF8C66',
  '#A78BFA',
  '#F78FB3'
]

function makeCell(): Cell {
  return { top: true, right: true, bottom: true, left: true }
}

function generateMaze(size: number): Grid {
  const grid: Grid = Array.from({ length: size }, () =>
    Array.from({ length: size }, makeCell)
  )
  const visited: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false)
  )
  const stack: Array<[number, number]> = [[0, 0]]
  visited[0][0] = true

  while (stack.length > 0) {
    const [r, c] = stack[stack.length - 1]
    const neighbors: Array<[number, number, Direction]> = []
    if (r > 0 && !visited[r - 1][c]) neighbors.push([r - 1, c, 'up'])
    if (c < size - 1 && !visited[r][c + 1]) neighbors.push([r, c + 1, 'right'])
    if (r < size - 1 && !visited[r + 1][c]) neighbors.push([r + 1, c, 'down'])
    if (c > 0 && !visited[r][c - 1]) neighbors.push([r, c - 1, 'left'])

    if (neighbors.length === 0) {
      stack.pop()
      continue
    }
    const [nr, nc, dir] =
      neighbors[Math.floor(Math.random() * neighbors.length)]
    if (dir === 'up') {
      grid[r][c].top = false
      grid[nr][nc].bottom = false
    } else if (dir === 'right') {
      grid[r][c].right = false
      grid[nr][nc].left = false
    } else if (dir === 'down') {
      grid[r][c].bottom = false
      grid[nr][nc].top = false
    } else {
      grid[r][c].left = false
      grid[nr][nc].right = false
    }
    visited[nr][nc] = true
    stack.push([nr, nc])
  }
  return grid
}

function toBlockGrid(grid: Grid): boolean[][] {
  const size = grid.length
  const dim = size * 2 + 1
  const blocks: boolean[][] = Array.from({ length: dim }, () =>
    Array.from({ length: dim }, () => true)
  )
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const br = r * 2 + 1
      const bc = c * 2 + 1
      blocks[br][bc] = false
      if (!grid[r][c].top) blocks[br - 1][bc] = false
      if (!grid[r][c].bottom) blocks[br + 1][bc] = false
      if (!grid[r][c].left) blocks[br][bc - 1] = false
      if (!grid[r][c].right) blocks[br][bc + 1] = false
    }
  }
  return blocks
}

/** Pick decoration spots on open path cells away from start/goal. */
function pickDecorations(grid: Grid, count: number): Array<[number, number]> {
  const size = grid.length
  const spots: Array<[number, number]> = []
  const taken = new Set<string>()
  let attempts = 0
  while (spots.length < count && attempts < count * 12) {
    attempts++
    const r = Math.floor(Math.random() * size)
    const c = Math.floor(Math.random() * size)
    const isStart = r === 0 && c === 0
    const isGoal = r === size - 1 && c === size - 1
    const key = `${r}-${c}`
    if (isStart || isGoal || taken.has(key)) continue
    taken.add(key)
    spots.push([r * 2 + 1, c * 2 + 1])
  }
  return spots
}

function parseStats(raw: unknown): MazeStats {
  const fallback: MazeStats = {
    unlockedLevels: 1,
    completedLevels: [],
    mazesCompleted: 0,
    totalCheeses: 0,
    bestTimes: {}
  }
  if (!raw || typeof raw !== 'object') return fallback
  const r = raw as Partial<MazeStats>
  return {
    unlockedLevels:
      typeof r.unlockedLevels === 'number' && r.unlockedLevels >= 1
        ? r.unlockedLevels
        : 1,
    completedLevels: Array.isArray(r.completedLevels) ? r.completedLevels : [],
    mazesCompleted: typeof r.mazesCompleted === 'number' ? r.mazesCompleted : 0,
    totalCheeses: typeof r.totalCheeses === 'number' ? r.totalCheeses : 0,
    bestTimes:
      r.bestTimes && typeof r.bestTimes === 'object' ? r.bestTimes : {}
  }
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export default function MazeGame({
  onWin,
  onExit,
  moduleState,
  saveModuleState
}: GameProps): JSX.Element {
  const [stats, setStats] = useState<MazeStats>(() => parseStats(moduleState))
  const [view, setView] = useState<'select' | 'play'>('select')
  const [levelIndex, setLevelIndex] = useState(0)

  const level: MazeLevel = LEVELS[levelIndex]
  const theme = THEMES[level.themeId]

  const [grid, setGrid] = useState<Grid>(() => generateMaze(LEVELS[0].size))
  const [decorations, setDecorations] = useState<Array<[number, number]>>([])
  const [mouse, setMouse] = useState({ r: 0, c: 0 })
  const [moves, setMoves] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [won, setWon] = useState(false)
  const [showCard, setShowCard] = useState(false)
  const [rewards, setRewards] = useState<EarnedReward[]>([])
  const [lastTime, setLastTime] = useState(0)
  const [muted, setMutedState] = useState(audio.isMuted())

  const size = level.size
  const goal = useMemo(() => ({ r: size - 1, c: size - 1 }), [size])
  const blockGrid = useMemo(() => toBlockGrid(grid), [grid])
  const dim = blockGrid.length

  // --- Refs for the render loop -----------------------------------------
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const imagesRef = useRef<Map<string, HTMLImageElement>>(new Map())
  const [imagesReady, setImagesReady] = useState(false)

  const mouseRef = useRef(mouse)
  const wonRef = useRef(false)
  const facingRef = useRef<1 | -1>(1)
  const posRef = useRef({ x: 1.5, y: 1.5 })
  const winTimeRef = useRef(0)
  const confettiRef = useRef<Confetto[]>([])

  useEffect(() => {
    mouseRef.current = mouse
  }, [mouse])
  useEffect(() => {
    wonRef.current = won
  }, [won])

  // --- Preload all theme + sprite images once ---------------------------
  useEffect(() => {
    const urls = new Set<string>([SPRITES.mouse, SPRITES.cheese])
    Object.values(THEMES).forEach((t) => {
      urls.add(t.wall)
      urls.add(t.floor)
      urls.add(t.decoration)
    })
    let cancelled = false
    Promise.all(
      [...urls].map((url) =>
        loadImage(url)
          .then((img) => [url, img] as const)
          .catch(() => [url, null] as const)
      )
    ).then((entries) => {
      if (cancelled) return
      const map = new Map<string, HTMLImageElement>()
      for (const [url, img] of entries) if (img) map.set(url, img)
      imagesRef.current = map
      setImagesReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // --- Timer while playing ----------------------------------------------
  useEffect(() => {
    if (view !== 'play' || won) return
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => window.clearInterval(id)
  }, [view, won])

  // --- Start / restart a level ------------------------------------------
  const startLevel = useCallback((index: number) => {
    const lvl = LEVELS[index]
    const newGrid = generateMaze(lvl.size)
    setGrid(newGrid)
    setDecorations(pickDecorations(newGrid, Math.min(8, Math.ceil(lvl.size / 1.2))))
    setLevelIndex(index)
    setMouse({ r: 0, c: 0 })
    mouseRef.current = { r: 0, c: 0 }
    posRef.current = { x: 1.5, y: 1.5 }
    facingRef.current = 1
    setMoves(0)
    setSeconds(0)
    setWon(false)
    setShowCard(false)
    setRewards([])
    confettiRef.current = []
    setView('play')
    audio.unlock()
    audio.menu()
    audio.startMusic()
  }, [])

  // --- Movement ----------------------------------------------------------
  const move = useCallback(
    (dir: Direction) => {
      if (wonRef.current) return
      const prev = mouseRef.current
      const cell = grid[prev.r]?.[prev.c]
      if (!cell) return
      let { r, c } = prev
      if (dir === 'up' && !cell.top) r -= 1
      else if (dir === 'down' && !cell.bottom) r += 1
      else if (dir === 'left' && !cell.left) c -= 1
      else if (dir === 'right' && !cell.right) c += 1

      if (dir === 'left') facingRef.current = -1
      else if (dir === 'right') facingRef.current = 1

      if (r === prev.r && c === prev.c) {
        audio.bump()
        return
      }
      mouseRef.current = { r, c }
      setMouse({ r, c })
      setMoves((m) => m + 1)
      audio.move()
    },
    [grid]
  )

  // --- Win handling ------------------------------------------------------
  useEffect(() => {
    if (view !== 'play' || won) return
    if (mouse.r === goal.r && mouse.c === goal.c) {
      setWon(true)
      winTimeRef.current = performance.now()
      audio.win()

      // Burst of confetti at the cheese.
      const gx = (goal.c * 2 + 1 + 0.5)
      const gy = (goal.r * 2 + 1 + 0.5)
      const pieces: Confetto[] = []
      for (let i = 0; i < 90; i++) {
        const ang = Math.random() * Math.PI * 2
        const spd = 2 + Math.random() * 6
        pieces.push({
          x: gx,
          y: gy,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 4,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.4,
          size: 0.18 + Math.random() * 0.22,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          life: 1.4 + Math.random() * 0.8
        })
      }
      confettiRef.current = pieces

      // Update + persist stats.
      const elapsed = seconds
      setLastTime(elapsed)
      setStats((prev) => {
        const prevBest = prev.bestTimes[level.id]
        const completed = prev.completedLevels.includes(level.id)
          ? prev.completedLevels
          : [...prev.completedLevels, level.id]
        const next: MazeStats = {
          unlockedLevels: Math.min(
            LEVELS.length,
            Math.max(prev.unlockedLevels, levelIndex + 2)
          ),
          completedLevels: completed,
          mazesCompleted: prev.mazesCompleted + 1,
          totalCheeses: prev.totalCheeses + 1,
          bestTimes: {
            ...prev.bestTimes,
            [level.id]:
              prevBest == null ? elapsed : Math.min(prevBest, elapsed)
          }
        }
        saveModuleState(next)
        return next
      })

      // Record a generic "games" completion (feeds badges/favorites).
      setRewards(onWin())

      // Show the results card after a short on-board celebration.
      window.setTimeout(() => setShowCard(true), 1300)
    }
  }, [mouse, won, view, goal, seconds, level.id, levelIndex, onWin, saveModuleState])

  // --- Keyboard controls (arrows + WASD) --------------------------------
  useEffect(() => {
    if (view !== 'play') return
    const keyMap: Record<string, Direction> = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
      w: 'up',
      W: 'up',
      s: 'down',
      S: 'down',
      a: 'left',
      A: 'left',
      d: 'right',
      D: 'right'
    }
    const onKey = (e: KeyboardEvent): void => {
      const dir = keyMap[e.key]
      if (!dir) return
      e.preventDefault()
      move(dir)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view, move])

  // --- Canvas render loop ------------------------------------------------
  useEffect(() => {
    if (view !== 'play' || !imagesReady) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const tile = Math.max(18, Math.floor(560 / dim))
    const dpr = window.devicePixelRatio || 1
    canvas.width = dim * tile * dpr
    canvas.height = dim * tile * dpr
    canvas.style.aspectRatio = '1 / 1'

    const getImg = (url: string): HTMLImageElement | null =>
      imagesRef.current.get(url) ?? null
    const wallImg = getImg(theme.wall)
    const floorImg = getImg(theme.floor)
    const decoImg = getImg(theme.decoration)
    const mouseImg = getImg(SPRITES.mouse)
    const cheeseImg = getImg(SPRITES.cheese)

    let raf = 0
    let last = 0
    let clock = 0

    const drawSprite = (
      img: HTMLImageElement,
      cx: number,
      cy: number,
      w: number,
      h: number,
      flip: 1 | -1,
      rot = 0
    ): void => {
      ctx.save()
      ctx.translate(cx, cy)
      if (rot) ctx.rotate(rot)
      if (flip === -1) ctx.scale(-1, 1)
      ctx.drawImage(img, -w / 2, -h / 2, w, h)
      ctx.restore()
    }

    const shadow = (cx: number, cy: number, w: number): void => {
      ctx.save()
      ctx.fillStyle = 'rgba(20, 30, 25, 0.22)'
      ctx.beginPath()
      ctx.ellipse(cx, cy + tile * 0.32, w * 0.45, w * 0.18, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    const render = (time: number): void => {
      const dt = last === 0 ? 0 : Math.min(0.05, (time - last) / 1000)
      last = time
      clock += dt

      // Ease the mouse toward its target cell.
      const tBr = mouseRef.current.r * 2 + 1
      const tBc = mouseRef.current.c * 2 + 1
      const tx = tBc + 0.5
      const ty = tBr + 0.5
      const k = Math.min(1, dt * EASE)
      posRef.current.x += (tx - posRef.current.x) * k
      posRef.current.y += (ty - posRef.current.y) * k

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, dim * tile, dim * tile)

      // Tiles.
      for (let br = 0; br < dim; br++) {
        for (let bc = 0; bc < dim; bc++) {
          const x = bc * tile
          const y = br * tile
          if (floorImg) ctx.drawImage(floorImg, x, y, tile, tile)
          else {
            ctx.fillStyle = theme.floorColor
            ctx.fillRect(x, y, tile, tile)
          }
          if (blockGrid[br][bc]) {
            if (wallImg) ctx.drawImage(wallImg, x, y, tile, tile)
            else {
              ctx.fillStyle = theme.wallColor
              ctx.fillRect(x, y, tile, tile)
            }
          }
        }
      }

      // Ambient overlay (e.g. moonlight tint).
      if (theme.ambient) {
        ctx.fillStyle = theme.ambient
        ctx.fillRect(0, 0, dim * tile, dim * tile)
      }

      // Decorations on path cells.
      if (decoImg) {
        for (const [br, bc] of decorations) {
          const cx = (bc + 0.5) * tile
          const cy = (br + 0.5) * tile
          const bob = Math.sin(clock * 1.5 + br + bc) * 1.2
          ctx.drawImage(
            decoImg,
            cx - tile * 0.34,
            cy - tile * 0.34 + bob,
            tile * 0.68,
            tile * 0.68
          )
        }
      }

      // Cheese at the goal, gently bobbing.
      const gBr = goal.r * 2 + 1
      const gBc = goal.c * 2 + 1
      const cheeseCx = (gBc + 0.5) * tile
      const cheeseCy = (gBr + 0.5) * tile
      const cheeseBob = Math.sin(clock * 2.2) * 2
      shadow(cheeseCx, cheeseCy, tile * 0.95)
      if (cheeseImg) {
        drawSprite(
          cheeseImg,
          cheeseCx,
          cheeseCy + cheeseBob,
          tile * 1.1,
          tile * 1.1,
          1
        )
      }

      // Mouse: idle breathing, walking hop/squash, or victory dance.
      const mCx = posRef.current.x * tile
      const baseCy = posRef.current.y * tile
      const moving =
        Math.abs(tx - posRef.current.x) + Math.abs(ty - posRef.current.y) > 0.03

      let mCy = baseCy
      let scaleX = 1
      let scaleY = 1
      let rot = 0

      if (wonRef.current) {
        const since = (time - winTimeRef.current) / 1000
        const jump = Math.abs(Math.sin(since * 6)) * tile * 0.5
        mCy = baseCy - jump
        rot = Math.sin(since * 10) * 0.25
        const pulse = 1 + Math.sin(since * 8) * 0.08
        scaleX = pulse
        scaleY = pulse
      } else if (moving) {
        const hop = Math.abs(Math.sin(clock * 14)) * tile * 0.12
        mCy = baseCy - hop
        scaleX = 1 + Math.sin(clock * 14) * 0.05
        scaleY = 1 - Math.sin(clock * 14) * 0.05
      } else {
        const breathe = Math.sin(clock * 2.5) * 0.03
        scaleX = 1 - breathe
        scaleY = 1 + breathe
      }

      shadow(mCx, baseCy, tile * 1.0)
      if (mouseImg) {
        const w = tile * 1.25 * scaleX
        const h = tile * 1.25 * scaleY
        drawSprite(mouseImg, mCx, mCy, w, h, facingRef.current, rot)
      }

      // Confetti.
      if (confettiRef.current.length > 0) {
        const next: Confetto[] = []
        for (const p of confettiRef.current) {
          p.life -= dt
          if (p.life <= 0) continue
          p.vy += dt * 9 // gravity (tile units / s^2-ish)
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.rot += p.vr
          ctx.save()
          ctx.globalAlpha = Math.max(0, Math.min(1, p.life))
          ctx.translate(p.x * tile, p.y * tile)
          ctx.rotate(p.rot)
          ctx.fillStyle = p.color
          const s = p.size * tile
          ctx.fillRect(-s / 2, -s / 2, s, s * 0.6)
          ctx.restore()
          next.push(p)
        }
        confettiRef.current = next
      }

      raf = window.requestAnimationFrame(render)
    }

    raf = window.requestAnimationFrame(render)
    return () => window.cancelAnimationFrame(raf)
  }, [view, imagesReady, blockGrid, dim, theme, goal, decorations])

  const toggleMute = useCallback(() => {
    const next = !audio.isMuted()
    audio.setMuted(next)
    setMutedState(next)
    if (!next && view === 'play') audio.startMusic()
  }, [view])

  // --- Render: level select ---------------------------------------------
  if (view === 'select') {
    return (
      <div className="screen maze-select">
        <header className="maze-header">
          <div>
            <h1 className="maze-title">🐭 Mouse Maze</h1>
            <p className="maze-subtitle">Pick a maze and help the mouse find the cheese!</p>
          </div>
          <div className="maze-header__meta">
            <button
              className="icon-button"
              type="button"
              onClick={toggleMute}
              aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
            >
              {muted ? '🔇' : '🔊'}
            </button>
            <button
              className="pill-button pill-button--ghost"
              type="button"
              onClick={onExit}
            >
              ← Games
            </button>
          </div>
        </header>

        <div className="maze-stats-strip">
          <span className="count-chip">🧀 {stats.totalCheeses} cheeses</span>
          <span className="count-chip">🏆 {stats.mazesCompleted} mazes solved</span>
          <span className="count-chip">⭐ {stats.completedLevels.length}/{LEVELS.length} levels</span>
        </div>

        <div className="level-grid">
          {LEVELS.map((lvl, i) => {
            const unlocked = i < stats.unlockedLevels
            const done = stats.completedLevels.includes(lvl.id)
            const best = stats.bestTimes[lvl.id]
            return (
              <button
                key={lvl.id}
                className={`level-card level-card--${lvl.themeId}${
                  unlocked ? '' : ' level-card--locked'
                }`}
                type="button"
                disabled={!unlocked}
                onClick={() => unlocked && startLevel(i)}
              >
                <span className="level-card__badge">
                  {unlocked ? `Level ${i + 1}` : '🔒 Locked'}
                </span>
                <span className="level-card__name">{lvl.name}</span>
                <span className="level-card__diff">{lvl.difficulty}</span>
                {done && (
                  <span className="level-card__best">
                    ✅ Best: {best != null ? formatTime(best) : '—'}
                  </span>
                )}
                {!unlocked && (
                  <span className="level-card__hint">
                    Finish the level before to unlock!
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <footer className="activity-page__footer">
          <button className="big-button" type="button" onClick={onExit}>
            ← Back to Games
          </button>
        </footer>
      </div>
    )
  }

  // --- Render: playing ---------------------------------------------------
  const nextIndex = levelIndex + 1
  const hasNext = nextIndex < LEVELS.length
  const best = stats.bestTimes[level.id]
  const isNewBest = best != null && lastTime <= best

  return (
    <div className={`screen maze-game maze-game--${level.themeId}`}>
      <header className="maze-header">
        <div>
          <h1 className="maze-title">{level.name}</h1>
          <p className="maze-subtitle">
            Use arrow keys or WASD to reach the cheese 🧀
          </p>
        </div>
        <div className="maze-header__meta">
          <span className="time-pill">⏱️ {formatTime(seconds)}</span>
          <span className="time-pill">👣 {moves}</span>
          <button
            className="icon-button"
            type="button"
            onClick={toggleMute}
            aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <button
            className="pill-button pill-button--ghost"
            type="button"
            onClick={() => {
              audio.stopMusic()
              setView('select')
            }}
          >
            Levels
          </button>
        </div>
      </header>

      <div className="maze-layout">
        <canvas ref={canvasRef} className="maze-canvas" aria-label="Maze" />

        <div className="dpad" aria-hidden={won}>
          <button className="dpad__btn dpad__btn--up" type="button" onClick={() => move('up')} aria-label="Move up">▲</button>
          <button className="dpad__btn dpad__btn--left" type="button" onClick={() => move('left')} aria-label="Move left">◀</button>
          <button className="dpad__btn dpad__btn--right" type="button" onClick={() => move('right')} aria-label="Move right">▶</button>
          <button className="dpad__btn dpad__btn--down" type="button" onClick={() => move('down')} aria-label="Move down">▼</button>
        </div>
      </div>

      {showCard && (
        <div className="maze-win" role="status">
          <div className="maze-win__card">
            <span className="duck-mascot duck-mascot--lg" aria-hidden="true">🧀</span>
            <h2>You found the cheese!</h2>
            <p>Awesome work! You finished {level.name} in {formatTime(lastTime)}.</p>
            <div className="maze-win__stats">
              <span className="count-chip">+1 🧀</span>
              <span className="count-chip">
                {isNewBest ? '🌟 New best time!' : `Best: ${best != null ? formatTime(best) : '—'}`}
              </span>
            </div>
            {rewards.length > 0 && (
              <div className="celebration__rewards">
                {rewards.map((reward) => (
                  <span className="reward-chip reward-chip--new" key={reward.id}>
                    <span aria-hidden="true">{reward.icon}</span> New {reward.kind}: {reward.label}!
                  </span>
                ))}
              </div>
            )}
            <div className="maze-win__actions">
              {hasNext && stats.unlockedLevels > nextIndex && (
                <button className="big-button" type="button" onClick={() => startLevel(nextIndex)}>
                  Next: {LEVELS[nextIndex].name} →
                </button>
              )}
              <button className="pill-button" type="button" onClick={() => startLevel(levelIndex)}>
                Play again
              </button>
              <button
                className="link-button"
                type="button"
                onClick={() => {
                  audio.stopMusic()
                  setView('select')
                }}
              >
                Level Select
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
