"use client"

import * as React from "react"

import Footer from "react/components/layout/footer"
import Navbar from "react/components/layout/navbar"
import { useCompany } from "react/contexts/company-context"

type PublicLayoutShellProps = {
  children: React.ReactNode
}

export default function PublicLayoutShell({ children }: PublicLayoutShellProps) {
  const [mounted, setMounted] = React.useState(false)
  const { company } = useCompany()

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="h-16 border-b border-border/70 bg-background/80 backdrop-blur-xl" />
        <main className="flex-1">{children}</main>
        <div className="h-40 border-t border-border/70 bg-muted/25" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm"
      >
        Saltar al contenido principal
      </a>
      <Navbar companyName={company?.name} logoSrc={company?.logo} />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        {children}
      </main>
      <Footer companyName={company?.name} logoSrc={company?.logo} />
    </div>
  )
}
