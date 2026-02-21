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
