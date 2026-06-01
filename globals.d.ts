import type { AppApi } from '@shared/types'

declare global {
  interface Window {
    // preload の contextBridge で公開する API
    api: AppApi
  }
}

// schema.sql を文字列として import するための型宣言（Vite の ?raw）
declare module '*.sql?raw' {
  const content: string
  export default content
}

export {}
