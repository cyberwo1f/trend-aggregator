import { app, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { initDatabase } from './db/repository'
import { registerIpcHandlers } from './ipc'

/** メインウィンドウを生成する */
function createWindow(): void {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  win.on('ready-to-show', () => win.show())

  // 開発時は Vite dev サーバ、本番はビルド済み HTML を読み込む
  if (process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

void app.whenReady().then(() => {
  initDatabase()
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  // macOS 以外はウィンドウを全て閉じたら終了
  if (process.platform !== 'darwin') app.quit()
})
