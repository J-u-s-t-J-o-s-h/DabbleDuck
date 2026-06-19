import { app, BrowserWindow, ipcMain, Menu, globalShortcut } from 'electron'
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
import type {
  Profile,
  ProgressData,
  Settings,
  UsageData
} from '../renderer/types'

// In electron-vite, the dev server URL is provided via this env var.
const DEV_SERVER_URL = process.env['ELECTRON_RENDERER_URL']

let mainWindow: BrowserWindow | null = null
let kioskEnabled = false

function createWindow(settings: Settings): void {
  kioskEnabled = settings.kioskMode

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#FFF7E0',
    fullscreen: true,
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

  // --- Kiosk / safety handlers ------------------------------------------
  ipcMain.handle('kiosk:set', (_e, enabled: boolean) => {
    kioskEnabled = enabled
    if (mainWindow) {
      mainWindow.setKiosk(enabled)
      mainWindow.setFullScreen(true)
    }
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
