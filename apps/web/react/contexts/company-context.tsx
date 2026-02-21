"use client"

import * as React from "react"

export type CompanyData = {
  name: string
  logo: string
}

type CompanyContextValue = {
  company: CompanyData | null
  isLoading: boolean
}

const COMPANY_ENDPOINT = "https://dummyjson.com/products/1"

const CompanyContext = React.createContext<CompanyContextValue | undefined>(undefined)

type CompanyProviderProps = {
  children: React.ReactNode
}

export function CompanyProvider({ children }: CompanyProviderProps) {
  const [company, setCompany] = React.useState<CompanyData | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const controller = new AbortController()

    async function loadCompany() {
      try {
        const response = await fetch(COMPANY_ENDPOINT, {
          signal: controller.signal,
        })

        if (!response.ok) {
          setCompany(null)
          return
        }

        const data = (await response.json()) as {
          brand?: string
          thumbnail?: string
        }

        if (data.brand && data.thumbnail) {
          setCompany({ name: data.brand, logo: data.thumbnail })
        } else {
          setCompany(null)
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setCompany(null)
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void loadCompany()

    return () => {
      controller.abort()
    }
  }, [])

  const value = React.useMemo(
    () => ({
      company,
      isLoading,
    }),
    [company, isLoading]
  )

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>
}

export function useCompany() {
  const context = React.useContext(CompanyContext)

  if (!context) {
    throw new Error("useCompany must be used within a CompanyProvider")
  }

  return context
}
