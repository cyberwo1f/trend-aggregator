import { useState, type FormEvent } from 'react'
import type { Category, CategoryInput } from '@shared/types'

interface Props {
  categories: Category[]
  selectedId: number | null
  onSelect: (id: number) => void
  onAdd: (input: CategoryInput) => void | Promise<void>
}

export function Sidebar({ categories, selectedId, onSelect, onAdd }: Props) {
  const [name, setName] = useState('')
  const [purpose, setPurpose] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    void onAdd({ name: trimmed, purpose: purpose.trim() || null })
    setName('')
    setPurpose('')
  }

  return (
    <aside className="sidebar">
      <h1>Trend Aggregator</h1>
      <h2>カテゴリ</h2>
      <ul className="category-list">
        {categories.map((c) => (
          <li key={c.id}>
            <button className={c.id === selectedId ? 'active' : ''} onClick={() => onSelect(c.id)}>
              {c.name}
            </button>
          </li>
        ))}
        {categories.length === 0 && <li className="empty">まだカテゴリがありません</li>}
      </ul>

      <form className="add-form" onSubmit={submit}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="カテゴリ名" />
        <input
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder="調査目的（任意）"
        />
        <button type="submit">＋ 追加</button>
      </form>
    </aside>
  )
}
