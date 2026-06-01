import { app, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { initDatabase } from './db/repository'
import { registerIpcHandlers } from './ipc'

// 開発時のみ、プロジェクト直下の .env を process.env へ読み込む。
// electron-vite は VITE_ 系接頭辞の変数しか .env から読まないため、
// 収集に必要な ANTHROPIC_API_KEY はここで明示的に読み込む必要がある。
// 本番(packaged)では .env を使わず safeStorage を使う想定なので読み込まない（doc/ai-auth.md）。
if (!app.isPackaged) {
  try {
    process.loadEnvFile() // process.cwd()/.env を process.env に反映（Node 20.12+/24）
  } catch {
    // .env が無くても起動は継続（収集実行時に「鍵未設定」エラーで気づける）
  }
}

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
