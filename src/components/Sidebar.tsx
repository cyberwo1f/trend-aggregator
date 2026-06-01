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
      <div>
        <p className="sidebar-label t-caption-up">カテゴリ</p>
        <ul className="category-nav">
          {categories.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className={`category-nav-item ${c.id === selectedId ? 'is-active' : ''}`}
                onClick={() => onSelect(c.id)}
              >
                <span className="dot" />
                <span>{c.name}</span>
              </button>
            </li>
          ))}
          {categories.length === 0 && (
            <li className="sidebar-empty">まだカテゴリがありません</li>
          )}
        </ul>
      </div>

      <form className="add-form" onSubmit={submit}>
        <p className="sidebar-label t-caption-up">カテゴリを追加</p>
        <input
          className="text-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="カテゴリ名"
        />
        <input
          className="text-input"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder="調査目的（任意）"
        />
        <button type="submit" className="btn btn-primary btn-block">
          ＋ 追加
        </button>
      </form>
    </aside>
  )
}
