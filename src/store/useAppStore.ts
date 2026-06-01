import { useCallback, useEffect, useState } from 'react'
import type { Category, CategoryInput, Item, ItemFilter } from '@shared/types'

/** 画面状態と window.api 呼び出しをまとめる簡易ストア（フック） */
export function useAppStore() {
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [filter, setFilter] = useState<ItemFilter>('all')
  const [busy, setBusy] = useState(false)

  const refreshCategories = useCallback(async () => {
    const list = await window.api.listCategories()
    setCategories(list)
    setSelectedId((cur) => cur ?? list[0]?.id ?? null)
  }, [])

  const refreshItems = useCallback(async () => {
    if (selectedId == null) {
      setItems([])
      return
    }
    setItems(await window.api.listItems(selectedId, filter))
  }, [selectedId, filter])

  useEffect(() => {
    void refreshCategories()
  }, [refreshCategories])

  useEffect(() => {
    void refreshItems()
  }, [refreshItems])

  const addCategory = useCallback(
    async (input: CategoryInput) => {
      const created = await window.api.createCategory(input)
      await refreshCategories()
      setSelectedId(created.id)
    },
    [refreshCategories]
  )

  const collect = useCallback(async () => {
    if (selectedId == null) return
    setBusy(true)
    try {
      await window.api.collect(selectedId)
      await refreshItems()
    } finally {
      setBusy(false)
    }
  }, [selectedId, refreshItems])

  const toggle = useCallback(
    async (item: Item, field: 'isRead' | 'isFavorite' | 'isReadLater') => {
      const value = !item[field]
      if (field === 'isRead') await window.api.setRead(item.id, value)
      else if (field === 'isFavorite') await window.api.setFavorite(item.id, value)
      else await window.api.setReadLater(item.id, value)
      await refreshItems()
    },
    [refreshItems]
  )

  return {
    categories,
    selectedId,
    setSelectedId,
    items,
    filter,
    setFilter,
    busy,
    addCategory,
    collect,
    toggle,
  }
}
