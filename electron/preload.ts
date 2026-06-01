import { contextBridge, ipcRenderer } from 'electron'
import type { AppApi, CategoryInput, ItemFilter } from '@shared/types'

// レンダラ(WebView)へ公開する API。型は AppApi に準拠する。
const api: AppApi = {
  listCategories: () => ipcRenderer.invoke('categories:list'),
  createCategory: (input: CategoryInput) => ipcRenderer.invoke('categories:create', input),
  updateCategory: (id: number, input: CategoryInput) =>
    ipcRenderer.invoke('categories:update', id, input),
  deleteCategory: (id: number) => ipcRenderer.invoke('categories:delete', id),

  listItems: (categoryId: number, filter: ItemFilter) =>
    ipcRenderer.invoke('items:list', categoryId, filter),
  setRead: (itemId: number, value: boolean) => ipcRenderer.invoke('items:setRead', itemId, value),
  setFavorite: (itemId: number, value: boolean) =>
    ipcRenderer.invoke('items:setFavorite', itemId, value),
  setReadLater: (itemId: number, value: boolean) =>
    ipcRenderer.invoke('items:setReadLater', itemId, value),

  collect: (categoryId: number) => ipcRenderer.invoke('collect:run', categoryId),
}

contextBridge.exposeInMainWorld('api', api)
