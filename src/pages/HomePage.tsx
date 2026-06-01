import { TopBar } from '../components/TopBar'
import { Sidebar } from '../components/Sidebar'
import { ItemList } from '../components/ItemList'
import { useAppStore } from '../store/useAppStore'

export function HomePage() {
  const store = useAppStore()
  const selectedCategory =
    store.categories.find((c) => c.id === store.selectedId) ?? null

  return (
    <div className="app-shell">
      <TopBar />
      <div className="main">
        <Sidebar
          categories={store.categories}
          selectedId={store.selectedId}
          onSelect={store.setSelectedId}
          onAdd={store.addCategory}
        />
        <ItemList
          category={selectedCategory}
          items={store.items}
          filter={store.filter}
          onFilterChange={store.setFilter}
          busy={store.busy}
          progress={store.progress}
          collectionModel={store.collectionModel}
          onModelChange={store.setCollectionModel}
          onCollect={store.collect}
          onToggle={store.toggle}
        />
      </div>
    </div>
  )
}
