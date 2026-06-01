import { SpikeMark } from './SpikeMark'

/** top-nav（DESIGN.md top-nav）: 64px, cream, スパイクマーク + ワードマーク */
export function TopBar() {
  return (
    <header className="topbar">
      <div className="brand">
        <SpikeMark size={20} className="brand-mark" />
        <span className="brand-name">Trend Aggregator</span>
      </div>
      <span className="brand-tag">トレンドを収集し、Claude が要約</span>
    </header>
  )
}
