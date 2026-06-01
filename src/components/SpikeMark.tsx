interface Props {
  size?: number
  className?: string
}

/**
 * Anthropic 風のラジアル・スパイクマーク（4 スポーク = 8 放射）。
 * ブランドのワードマーク接頭辞・空状態の装飾に使う。色は currentColor。
 * 公式ロゴ資産ではなく、DESIGN.md の記述に沿った近似グリフ。
 */
export function SpikeMark({ size = 18, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <g stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <line x1="12" y1="2.5" x2="12" y2="21.5" />
        <line x1="2.5" y1="12" x2="21.5" y2="12" />
        <line x1="5.3" y1="5.3" x2="18.7" y2="18.7" />
        <line x1="18.7" y1="5.3" x2="5.3" y2="18.7" />
      </g>
    </svg>
  )
}
