import { app, BrowserWindow, ipcMain, Menu, globalShortcut } from 'electron'
import { promises as fs, existsSync } from 'fs'
import { join } from 'path'
import {
  getProfiles,
  getProgress,
  getSettings,
  getUsage,
  saveProfiles,
  saveProgress,
  saveSettings,
  saveUsage
} from './storage'
import {
  buildLaunchContext,
  makeSessionId,
  parseEvents,
  parseResult,
  sessionPaths
} from './gameSession'
import { launchProcess, resolveSpawnSpec, validateGameLaunch } from './gameLauncher'
import { reconcile } from './gameReconciler'
import { ensureProgress } from '../renderer/services/progressService'
import type { GameManifest, SettingsSnapshot } from '../shared/gameContract'
import type {
  GameLaunchRequest,
  GameLaunchResult,
  Profile,
  ProgressData,
  Settings,
  UsageData
} from '../renderer/types'

// In electron-vite, the dev server URL is provided via this env var.
const DEV_SERVER_URL = process.env['ELECTRON_RENDERER_URL']

let mainWindow: BrowserWindow | null = null
let kioskEnabled = false

const isMac = process.platform === 'darwin'

/**
 * Make the launcher fill the screen in a way that plays nicely with spawning
 * separate game windows.
 *
 * On macOS, native fullscreen puts the window in its own "Space"; a windowed
 * game (e.g. Godot) then forces a switch to the desktop Space, and when the
 * game quits the child is left on the desktop. macOS "simple fullscreen" fills
 * the screen while staying in the SAME Space, so focus returns to the launcher
 * when the game exits. On Windows/Linux, normal fullscreen is fine.
 */
function applyImmersive(win: BrowserWindow): void {
  if (kioskEnabled) {
    // On macOS, exit simple fullscreen before entering native kiosk.
    if (isMac && win.isSimpleFullScreen()) win.setSimpleFullScreen(false)
    win.setKiosk(true)
    return
  }
  // Not kiosk: ensure kiosk is cleared on EVERY platform (so toggling kiosk
  // off actually leaves kiosk), then fill the screen.
  if (win.isKiosk()) win.setKiosk(false)
  if (isMac) {
    if (!win.isSimpleFullScreen()) win.setSimpleFullScreen(true)
  } else {
    win.setFullScreen(true)
  }
}

function createWindow(settings: Settings): void {
  kioskEnabled = settings.kioskMode

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#FFF7E0',
    // On macOS we apply "simple fullscreen" after show (see applyImmersive);
    // native fullscreen would create a separate Space and break safe return.
    fullscreen: !isMac,
    // In kiosk mode, lock the window down harder.
    kiosk: kioskEnabled,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  // No traditional desktop menu bar in a child launcher.
  Menu.setApplicationMenu(null)
  mainWindow.setMenuBarVisibility(false)

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    if (mainWindow) applyImmersive(mainWindow)
  })

  // Block external navigation and new windows for safety.
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  if (DEV_SERVER_URL) {
    mainWindow.loadURL(DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

/**
 * Register global shortcuts that intercept the common quit / escape
 * combinations while in kiosk mode. This is a practical guard for
 * Windows development, not a guarantee of OS-level lockdown.
 */
function applyKioskShortcuts(enabled: boolean): void {
  globalShortcut.unregisterAll()
  if (!enabled) return

  const blocked = [
    'CommandOrControl+W',
    'CommandOrControl+Q',
    'CommandOrControl+R',
    'CommandOrControl+Shift+R',
    'Alt+F4',
    'F11'
  ]
  for (const accelerator of blocked) {
    // Registering a no-op handler swallows the shortcut.
    globalShortcut.register(accelerator, () => {})
  }
}

// ---------------------------------------------------------------------------
// Standalone game launch + reconciliation
// ---------------------------------------------------------------------------

/** Locate the games directory in dev (repo) or production (resources). */
function resolveGamesRoot(): string {
  const resourcesPath = (process as unknown as { resourcesPath?: string })
    .resourcesPath
  const candidates = [
    join(app.getAppPath(), 'games'),
    join(__dirname, '../../games'),
    ...(resourcesPath ? [join(resourcesPath, 'games')] : [])
  ]
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }
  return candidates[0]
}

/** Find the game folder whose manifest declares the given game id. */
async function findGameDir(gameId: string): Promise<string | null> {
  const root = resolveGamesRoot()
  let entries: string[] = []
  try {
    entries = await fs.readdir(root)
  } catch {
    return null
  }
  for (const entry of entries) {
    const manifestPath = join(root, entry, 'game.json')
    if (!existsSync(manifestPath)) continue
    try {
      const manifest = JSON.parse(
        await fs.readFile(manifestPath, 'utf-8')
      ) as GameManifest
      if (manifest.id === gameId) return join(root, entry)
    } catch {
      // Skip an unreadable/invalid manifest.
    }
  }
  return null
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Whole seconds of screen time remaining for a child today. */
function remainingSecondsFor(
  profile: Profile,
  usage: UsageData
): number {
  const record = usage[profile.id]
  const usedToday =
    record && record.date === todayStr() ? record.secondsUsedToday : 0
  return Math.max(0, profile.dailyLimitMinutes * 60 - usedToday)
}

/**
 * Launch a standalone game for a child, wait for it to exit, then fold its
 * emitted events into the child's canonical progress. The launcher is the
 * single authoritative writer of progress.json.
 */
async function launchGame(
  req: GameLaunchRequest
): Promise<GameLaunchResult> {
  const progressData = await getProgress()
  const fail = (error: string): GameLaunchResult => ({
    ok: false,
    completedCleanly: false,
    sessionId: '',
    newlyEarned: [],
    progress: progressData,
    error
  })

  const profiles = await getProfiles()
  const profile = profiles.find((p) => p.id === req.profileId)
  if (!profile) return fail(`Unknown profile: ${req.profileId}`)

  const gameDir = await findGameDir(req.gameId)
  if (!gameDir) return fail(`Game not found: ${req.gameId}`)

  let manifest: GameManifest
  try {
    manifest = JSON.parse(
      await fs.readFile(join(gameDir, 'game.json'), 'utf-8')
    ) as GameManifest
  } catch (err) {
    return fail(`Invalid manifest for ${req.gameId}: ${String(err)}`)
  }

  const launchCheck = validateGameLaunch(manifest, gameDir)
  if (!launchCheck.ok) {
    return fail(launchCheck.error)
  }

  const usage = await getUsage()
  const baseChild = ensureProgress(progressData, profile.id)

  const sessionId = makeSessionId(profile.id, manifest.id)
  const sessionDir = join(app.getPath('userData'), 'sessions', sessionId)
  const paths = sessionPaths(sessionDir)

  const settingsSnapshot: SettingsSnapshot = {
    soundEnabled: true,
    locale: 'en-US',
    reducedMotion: false
  }

  const launch = buildLaunchContext({
    sessionId,
    manifest,
    profile,
    settings: settingsSnapshot,
    remainingSeconds: remainingSecondsFor(profile, usage),
    moduleState: baseChild.modules[manifest.id] ?? null
  })

  try {
    await fs.mkdir(sessionDir, { recursive: true })
    await fs.writeFile(paths.launch, JSON.stringify(launch, null, 2), 'utf-8')
    // Create an empty event log so the game can append to it.
    await fs.writeFile(paths.events, '', 'utf-8')

    const spec = resolveSpawnSpec(manifest, gameDir, sessionDir)
    const exit = await launchProcess(spec)

    // The game took over the foreground (its own OS window). When it exits we
    // must pull DabbleDuck back to the front, otherwise the child lands on the
    // desktop instead of returning to the launcher.
    restoreLauncherFocus()

    const rawEvents = await fs.readFile(paths.events, 'utf-8').catch(() => '')
    const rawResult = await fs.readFile(paths.result, 'utf-8').catch(() => null)
    const events = parseEvents(rawEvents)
    const result = parseResult(rawResult)

    const { progress: updatedChild, newlyEarned } = reconcile(
      baseChild,
      events,
      manifest
    )

    const updatedProgress: ProgressData = {
      ...progressData,
      [profile.id]: updatedChild
    }
    await saveProgress(updatedProgress)

    return {
      ok: true,
      completedCleanly: result?.completedCleanly === true && exit.code === 0,
      sessionId,
      newlyEarned,
      progress: updatedProgress
    }
  } catch (err) {
    restoreLauncherFocus()
    return fail(`Failed to run game: ${String(err)}`)
  }
}

/**
 * Re-assert the launcher window as the foreground app. After a standalone game
 * (its own OS window) exits, the OS would otherwise show whatever was behind it
 * (the desktop), so we restore + focus DabbleDuck and steal focus on macOS.
 */
function restoreLauncherFocus(): void {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    applyImmersive(mainWindow)
    mainWindow.focus()
  }
  // macOS: bring the whole app forward even though another app had focus.
  app.focus({ steal: true })
}

app.whenReady().then(async () => {
  const settings = await getSettings()

  // --- Data IPC handlers -------------------------------------------------
  ipcMain.handle('settings:get', () => getSettings())
  ipcMain.handle('settings:save', (_e, value: Settings) => saveSettings(value))
  ipcMain.handle('profiles:get', () => getProfiles())
  ipcMain.handle('profiles:save', (_e, value: Profile[]) =>
    saveProfiles(value)
  )
  ipcMain.handle('usage:get', () => getUsage())
  ipcMain.handle('usage:save', (_e, value: UsageData) => saveUsage(value))
  ipcMain.handle('progress:get', () => getProgress())
  ipcMain.handle('progress:save', (_e, value: ProgressData) =>
    saveProgress(value)
  )

  // --- Standalone game launch -------------------------------------------
  ipcMain.handle('game:launch', (_e, req: GameLaunchRequest) =>
    launchGame(req)
  )
  ipcMain.handle('game:canLaunch', async (_e, gameId: string) => {
    const gameDir = await findGameDir(gameId)
    if (!gameDir) return { ok: false, error: `Game not found: ${gameId}` }
    try {
      const manifest = JSON.parse(
        await fs.readFile(join(gameDir, 'game.json'), 'utf-8')
      ) as GameManifest
      return validateGameLaunch(manifest, gameDir)
    } catch (err) {
      return { ok: false, error: `Invalid manifest: ${String(err)}` }
    }
  })

  // --- Kiosk / safety handlers ------------------------------------------
  ipcMain.handle('kiosk:set', (_e, enabled: boolean) => {
    kioskEnabled = enabled
    if (mainWindow) applyImmersive(mainWindow)
    applyKioskShortcuts(enabled)
  })

  // Exit requires the correct parent PIN while kiosk mode is on.
  ipcMain.handle('app:requestExit', async (_e, pin: string) => {
    const current = await getSettings()
    if (!kioskEnabled || pin === current.parentPin) {
      app.quit()
      return true
    }
    return false
  })

  createWindow(settings)
  applyKioskShortcuts(settings.kioskMode)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(settings)
    }
  })
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
