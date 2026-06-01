import { ipcMain } from 'electron'
import { categoriesRepo, itemsRepo, runsRepo } from './db/repository'
import { collectForCategory } from './agent/collector'
import { summarize } from './agent/summarizer'
import type { CategoryInput, ItemFilter } from '@shared/types'

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

  // --- 収集（再収集） ---
  ipcMain.handle('collect:run', async (_e, categoryId: number) => {
    const category = categoriesRepo.get(categoryId)
    if (!category) throw new Error(`カテゴリ ${categoryId} が見つかりません`)

    const runId = runsRepo.start(categoryId)
    try {
      // 1. 一覧クリア（お気に入り・後で見るは保持）
      itemsRepo.clearTransient(categoryId)
      // 2. Web 検索で収集
      const collected = await collectForCategory(category)
      // 3. 目的に沿って要約・整理
      const summarized = await summarize(collected, category.purpose)
      // 4. 保存
      const added = itemsRepo.insertCollected(categoryId, runId, summarized)
      runsRepo.finish(runId, 'done')
      return { runId, added }
    } catch (err) {
      runsRepo.finish(runId, 'error')
      throw err
    }
  })
}
