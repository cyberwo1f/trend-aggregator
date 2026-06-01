import type { Item, ItemFilter } from '@shared/types'

interface Props {
  items: Item[]
  filter: ItemFilter
  onFilterChange: (f: ItemFilter) => void
  busy: boolean
  hasSelection: boolean
  onCollect: () => void | Promise<void>
  onToggle: (item: Item, field: 'isRead' | 'isFavorite' | 'isReadLater') => void | Promise<void>
}

const FILTERS: { key: ItemFilter; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'unread', label: '未読' },
  { key: 'favorite', label: 'お気に入り' },
  { key: 'readLater', label: '後で見る' },
]

export function ItemList({
  items,
  filter,
  onFilterChange,
  busy,
  hasSelection,
  onCollect,
  onToggle,
}: Props) {
  return (
    <main className="content">
      <div className="toolbar">
        <div className="tabs">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={f.key === filter ? 'active' : ''}
              onClick={() => onFilterChange(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          className="collect"
          disabled={!hasSelection || busy}
          onClick={() => void onCollect()}
        >
          {busy ? '収集中…' : '🔄 再収集'}
        </button>
      </div>

      {!hasSelection && <p className="empty">カテゴリを選択してください。</p>}

      <ul className="items">
        {items.map((it) => (
          <li key={it.id} className={it.isRead ? 'read' : 'unread'}>
            <div className="item-head">
              <a href={it.url} target="_blank" rel="noreferrer">
                {it.title}
              </a>
              {it.importance != null && <span className="badge">重要度 {it.importance}</span>}
            </div>
            {it.aiSummary && <p className="summary">{it.aiSummary}</p>}
            <div className="actions">
              <button onClick={() => void onToggle(it, 'isRead')}>
                {it.isRead ? '既読' : '未読にする'}
              </button>
              <button onClick={() => void onToggle(it, 'isFavorite')}>
                {it.isFavorite ? '★ お気に入り' : '☆ お気に入り'}
              </button>
              <button onClick={() => void onToggle(it, 'isReadLater')}>
                {it.isReadLater ? '🔖 後で見る' : '後で見る'}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {hasSelection && items.length === 0 && (
        <p className="empty">アイテムがありません。「再収集」で取得してください。</p>
      )}
    </main>
  )
}
