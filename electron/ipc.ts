import { ipcMain } from 'electron'
import { categoriesRepo, itemsRepo, runsRepo, settingsRepo } from './db/repository'
import { collectForCategory, DEFAULT_MODEL } from './agent/collector'
import type { CategoryInput, CollectProgress, ItemFilter } from '@shared/types'

/** 収集モデルを保持する設定キー */
const COLLECTION_MODEL_KEY = 'collection_model'

/** レンダラからの IPC 呼び出しを登録する */
export function registerIpcHandlers(): void {
  // --- カテゴリ ---
  ipcMain.handle('categories:list', () => categoriesRepo.list())
  ipcMain.handle('categories:create', (_e, input: CategoryInput) => categoriesRepo.create(input))
  ipcMain.handle('categories:update', (_e, id: number, input: CategoryInput) =>
    categoriesRepo.update(id, input)
  )
  ipcMain.handle('categories:delete', (_e, id: number) => categoriesRepo.remove(id))

  // --- アイテム ---
  ipcMain.handle('items:list', (_e, categoryId: number, filter: ItemFilter) =>
    itemsRepo.list(categoryId, filter)
  )
  ipcMain.handle('items:setRead', (_e, id: number, value: boolean) => itemsRepo.setRead(id, value))
  ipcMain.handle('items:setFavorite', (_e, id: number, value: boolean) =>
    itemsRepo.setFavorite(id, value)
  )
  ipcMain.handle('items:setReadLater', (_e, id: number, value: boolean) =>
    itemsRepo.setReadLater(id, value)
  )

  // --- 設定（収集モデル） ---
  ipcMain.handle('settings:getCollectionModel', () => settingsRepo.get(COLLECTION_MODEL_KEY) ?? DEFAULT_MODEL)
  ipcMain.handle('settings:setCollectionModel', (_e, model: string) =>
    settingsRepo.set(COLLECTION_MODEL_KEY, model)
  )

  // --- 収集（再収集） ---
  ipcMain.handle('collect:run', async (e, categoryId: number) => {
    const category = categoriesRepo.get(categoryId)
    if (!category) throw new Error(`カテゴリ ${categoryId} が見つかりません`)

    const model = settingsRepo.get(COLLECTION_MODEL_KEY) ?? DEFAULT_MODEL
    // 進捗をレンダラへ push（categoryId を付与）。ウィンドウが破棄済みなら無視
    const onProgress = (p: { phase: CollectProgress['phase']; message: string }) => {
      if (e.sender.isDestroyed()) return
      e.sender.send('collect:progress', { categoryId, ...p } satisfies CollectProgress)
    }

    const runId = runsRepo.start(categoryId)
    try {
      // 1. 一覧クリア（お気に入り・後で見るは保持）
      itemsRepo.clearTransient(categoryId)
      // 2. Web 検索で収集し、目的に沿って要約・整理（1 回のエージェントループ）
      const summarized = await collectForCategory(category, { model, onProgress })
      // 3. 保存
      const added = itemsRepo.insertCollected(categoryId, runId, summarized)
      runsRepo.finish(runId, 'done')
      return { runId, added }
    } catch (err) {
      runsRepo.finish(runId, 'error')
      throw err
    }
  })
}
