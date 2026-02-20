"use client"

import * as React from "react"

import Footer from "react/components/layout/footer"
import Navbar from "react/components/layout/navbar"

type PublicLayoutShellProps = {
  children: React.ReactNode
}

type CompanyData = {
  name: string
  logo: string
}

export default function PublicLayoutShell({ children }: PublicLayoutShellProps) {
  const [mounted, setMounted] = React.useState(false)
  const [company, setCompany] = React.useState<CompanyData | null>(null)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    const controller = new AbortController()

    async function loadCompany() {
      try {
        const response = await fetch("https://dummyjson.com/products/1", {
          signal: controller.signal,
        })

        if (!response.ok) {
          return
        }

        const data = (await response.json()) as {
          brand?: string
          thumbnail?: string
        }

        if (data.brand && data.thumbnail) {
          setCompany({ name: data.brand, logo: data.thumbnail })
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setCompany(null)
        }
      }
    }

    loadCompany()

    return () => {
      controller.abort()
    }
  }, [])

  if (!mounted) {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="h-16 border-b border-neutral-200 bg-background/95" />
        <main className="flex-1">{children}</main>
        <div className="h-40 border-t border-neutral-200 bg-neutral-100" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar companyName={company?.name} logoSrc={company?.logo} />
      <main className="flex-1">{children}</main>
      <Footer companyName={company?.name} logoSrc={company?.logo} />
    </div>
  )
}
