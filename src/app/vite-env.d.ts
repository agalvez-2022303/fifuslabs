/// <reference types="vite/client" />

declare module '*.module.css' {
  const classes: { readonly [key: string]: string }
  export default classes
}

declare module 'react-katex' {
  import type { ReactNode } from 'react'
  export const InlineMath: React.FC<{ math?: string; children?: ReactNode }>
  export const BlockMath: React.FC<{ math?: string; children?: ReactNode }>
}
