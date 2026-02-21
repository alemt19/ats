"use client"

import * as React from "react"
import { SessionProvider } from "next-auth/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "react/components/ui/sonner"
import { CompanyProvider } from "react/contexts/company-context"

type ProvidersProps = {
  children: React.ReactNode
}

export default function Providers({ children }: ProvidersProps) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <CompanyProvider>
          {children}
          <Toaster richColors position="top-right" />
        </CompanyProvider>
      </QueryClientProvider>
    </SessionProvider>
  )
}
