import { Sidebar } from '../components/Sidebar'
import { ItemList } from '../components/ItemList'
import { useAppStore } from '../store/useAppStore'

export function HomePage() {
  const store = useAppStore()
  return (
    <div className="layout">
      <Sidebar
        categories={store.categories}
        selectedId={store.selectedId}
        onSelect={store.setSelectedId}
        onAdd={store.addCategory}
      />
      <ItemList
        items={store.items}
        filter={store.filter}
        onFilterChange={store.setFilter}
        busy={store.busy}
        hasSelection={store.selectedId != null}
        onCollect={store.collect}
        onToggle={store.toggle}
      />
    </div>
  )
}
