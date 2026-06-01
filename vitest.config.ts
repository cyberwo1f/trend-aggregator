import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

// リポジトリ層（node:sqlite）のユニットテスト用設定。
// Vite 基盤なので repository.ts の `import ... from './schema.sql?raw'` もそのまま解決される。
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@shared': resolve(__dirname, 'shared'),
    },
  },
  test: {
    environment: 'node',
    include: ['electron/**/*.test.ts', 'src/**/*.test.{ts,tsx}'],
  },
})
