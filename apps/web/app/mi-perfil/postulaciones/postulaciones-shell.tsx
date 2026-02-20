"use client"

import * as React from "react"
import { Search } from "lucide-react"

import { Input } from "react/components/ui/input"

type FiltersContextValue = {
  query: string
  setQuery: (value: string) => void
  statusFilter: string
  setStatusFilter: (value: string) => void
  categoryFilter: string
  setCategoryFilter: (value: string) => void
}

const FiltersContext = React.createContext<FiltersContextValue | null>(null)

export function usePostulacionesFilters() {
  const context = React.useContext(FiltersContext)

  if (!context) {
    throw new Error("usePostulacionesFilters must be used within PostulacionesShell")
  }

  return context
}

type PostulacionesShellProps = {
  children: React.ReactNode
}

export default function PostulacionesShell({ children }: PostulacionesShellProps) {
  const [query, setQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [categoryFilter, setCategoryFilter] = React.useState("all")

  const value = React.useMemo(
    () => ({
      query,
      setQuery,
      statusFilter,
      setStatusFilter,
      categoryFilter,
      setCategoryFilter,
    }),
    [categoryFilter, query, statusFilter]
  )

  return (
    <FiltersContext.Provider value={value}>
      <div className="space-y-6">
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por titulo"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-9"
          />
        </div>

        {children}
      </div>
    </FiltersContext.Provider>
  )
}
