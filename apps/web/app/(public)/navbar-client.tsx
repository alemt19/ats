"use client"

import * as React from "react"

import Navbar from "react/components/layout/navbar"

export default function NavbarClient() {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="h-16 border-b border-neutral-200 bg-background/95" />
  }

  return <Navbar />
}
