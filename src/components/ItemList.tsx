import { COLLECTION_MODELS, type Category, type Item, type ItemFilter } from '@shared/types'
import { SpikeMark } from './SpikeMark'

interface Props {
  category: Category | null
  items: Item[]
  filter: ItemFilter
  onFilterChange: (f: ItemFilter) => void
  busy: boolean
  progress: string
  collectionModel: string
  onModelChange: (model: string) => void | Promise<void>
  onCollect: () => void | Promise<void>
  onToggle: (item: Item, field: 'isRead' | 'isFavorite' | 'isReadLater') => void | Promise<void>
}

const FILTERS: { key: ItemFilter; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'unread', label: '未読' },
  { key: 'favorite', label: 'お気に入り' },
  { key: 'readLater', label: '後で見る' },
]

/** ISO8601 文字列を YYYY/MM/DD で表示（不正値は空文字） */
function formatDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

export function ItemList({
  category,
  items,
  filter,
  onFilterChange,
  busy,
  progress,
  collectionModel,
  onModelChange,
  onCollect,
  onToggle,
}: Props) {
  // カテゴリ未選択: 空状態を中央に表示
  if (!category) {
    return (
      <main className="content">
        <div className="content-inner">
          <div className="empty-state">
            <SpikeMark size={40} className="empty-mark" />
            <p className="empty-title">カテゴリを選択してください</p>
            <p className="empty-sub">
              左のサイドバーからカテゴリを選ぶか、新しく追加するとトレンドの収集を始められます。
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="content">
      <div className="content-inner">
        <header className="content-header">
          <p className="eyebrow t-caption-up">トレンドダイジェスト</p>
          <h1 className="page-title t-display-md">{category.name}</h1>
          {category.purpose && <p className="page-subtitle">{category.purpose}</p>}
        </header>

        <div className="toolbar">
          <div className="tabs">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                className={`tab ${f.key === filter ? 'is-active' : ''}`}
                onClick={() => onFilterChange(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="toolbar-actions">
            <label className="model-select" title="収集に使う Claude モデル">
              <span className="model-select-label">モデル</span>
              <select
                value={collectionModel}
                disabled={busy}
                onChange={(e) => void onModelChange(e.target.value)}
              >
                {COLLECTION_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={() => void onCollect()}
            >
              {busy ? '収集中…' : '再収集'}
            </button>
          </div>
        </div>

        {busy && (
          <div className="collect-progress" role="status">
            <span className="collect-spinner" aria-hidden="true" />
            <span>{progress || '収集中…'}</span>
          </div>
        )}

        {items.length === 0 ? (
          <div className="empty-state">
            <SpikeMark size={36} className="empty-mark" />
            <p className="empty-title">まだアイテムがありません</p>
            <p className="empty-sub">
              「再収集」を押すと、このカテゴリのトレンドを Web から収集して要約します。
            </p>
          </div>
        ) : (
          <ul className="item-list">
            {items.map((it) => {
              const date = formatDate(it.publishedAt ?? it.collectedAt)
              return (
                <li
                  key={it.id}
                  className={`item-card ${it.isRead ? 'is-read' : 'is-unread'}`}
                >
                  <div className="item-top">
                    <div className="item-meta">
                      {it.source && <span className="source">{it.source}</span>}
                      {it.source && date && <span className="sep">·</span>}
                      {date && <span>{date}</span>}
                    </div>
                    {it.importance != null &&
                      (it.importance >= 8 ? (
                        <span className="badge badge-coral">重要</span>
                      ) : (
                        <span className="badge badge-pill">重要度 {it.importance}</span>
                      ))}
                  </div>

                  <a className="item-title" href={it.url} target="_blank" rel="noreferrer">
                    {it.title}
                  </a>

                  {it.aiSummary && <p className="item-summary">{it.aiSummary}</p>}

                  <div className="item-actions">
                    <button
                      type="button"
                      className={`chip ${it.isRead ? 'is-active' : ''}`}
                      onClick={() => void onToggle(it, 'isRead')}
                    >
                      {it.isRead ? '✓ 既読' : '未読にする'}
                    </button>
                    <button
                      type="button"
                      className={`chip ${it.isFavorite ? 'is-fav' : ''}`}
                      onClick={() => void onToggle(it, 'isFavorite')}
                    >
                      {it.isFavorite ? '★ お気に入り' : '☆ お気に入り'}
                    </button>
                    <button
                      type="button"
                      className={`chip ${it.isReadLater ? 'is-active' : ''}`}
                      onClick={() => void onToggle(it, 'isReadLater')}
                    >
                      {it.isReadLater ? '🔖 後で見る' : '後で見る'}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </main>
  )
}
