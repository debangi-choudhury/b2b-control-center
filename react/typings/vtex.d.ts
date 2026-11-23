declare module 'vtex.render-runtime' {
  export function useRuntime(): {
    culture: { locale: string; currency?: string }
    rootPath?: string
    navigate: (options: { to: string }) => void
  }
}

declare module '*.graphql' {
  import type { DocumentNode } from 'graphql'

  const value: DocumentNode
  export default value
}

/* Only the vtex.styleguide components and props this app uses */
declare module 'vtex.styleguide' {
  import type { ComponentType, ReactNode } from 'react'

  export const Layout: ComponentType<{
    pageHeader?: ReactNode
    fullWidth?: boolean
  }>

  export const PageHeader: ComponentType<{
    title: ReactNode
    subtitle?: ReactNode
  }>

  export const PageBlock: ComponentType<{
    title?: ReactNode
    subtitle?: ReactNode
    variation?: 'full' | 'half' | 'annotated' | 'aside'
  }>

  export const Button: ComponentType<{
    variation?: 'primary' | 'secondary' | 'tertiary'
    size?: 'small' | 'regular' | 'large'
    isLoading?: boolean
    disabled?: boolean
    onClick?: () => void
    children?: ReactNode
  }>

  export const Dropdown: ComponentType<{
    label?: ReactNode
    size?: 'small' | 'regular' | 'large'
    options: Array<{ value: string; label: string }>
    value?: string
    onChange: (e: unknown, value: string) => void
  }>

  export const Tag: ComponentType<{
    type?: 'success' | 'error' | 'warning' | 'neutral'
    variation?: 'low'
    size?: 'small' | 'regular'
    children?: ReactNode
  }>

  export const Pagination: ComponentType<{
    rowsOptions?: number[]
    selectedOption?: number
    currentItemFrom: number
    currentItemTo: number
    totalItems: number
    textOf?: ReactNode
    textShowRows?: ReactNode
    onRowsChange?: (e: unknown, value: string) => void
    onNextClick: () => void
    onPrevClick: () => void
  }>

  export const Spinner: ComponentType<{ size?: number }>

  export const Alert: ComponentType<{
    type: 'success' | 'error' | 'warning'
    children?: ReactNode
  }>
}
