"use client"

import * as React from "react"

type BreadcrumbTitleContextValue = {
  dynamicLabels: Map<string, string>
  setDynamicLabel: (id: string, label: string) => void
}

const BreadcrumbTitleContext = React.createContext<BreadcrumbTitleContextValue | null>(null)

export function BreadcrumbTitleProvider({ children }: { children: React.ReactNode }) {
  const [dynamicLabels, setDynamicLabels] = React.useState<Map<string, string>>(new Map())

  const setDynamicLabel = React.useCallback((id: string, label: string) => {
    if (!label) return
    setDynamicLabels((prev) => {
      if (prev.get(id) === label) return prev
      const next = new Map(prev)
      next.set(id, label)
      return next
    })
  }, [])

  const value = React.useMemo(() => ({ dynamicLabels, setDynamicLabel }), [dynamicLabels, setDynamicLabel])

  return <BreadcrumbTitleContext.Provider value={value}>{children}</BreadcrumbTitleContext.Provider>
}

export function useBreadcrumbTitle() {
  const ctx = React.useContext(BreadcrumbTitleContext)
  if (!ctx) throw new Error("useBreadcrumbTitle must be used inside BreadcrumbTitleProvider")
  return ctx
}

export function useSetBreadcrumbTitle(id: string | number, label: string) {
  const { setDynamicLabel } = useBreadcrumbTitle()
  React.useEffect(() => {
    if (label) setDynamicLabel(String(id), label)
  }, [id, label, setDynamicLabel])
}
