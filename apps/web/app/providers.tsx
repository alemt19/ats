"use client"

import * as React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "next-themes"
import { Toaster } from "react/components/ui/sonner"
import { CompanyProvider } from "react/contexts/company-context"
import { FontSizeProvider } from "react/contexts/font-size-context"
import { type FontSize } from "@repo/schema"

type ProvidersProps = {
  children: React.ReactNode
  initialFontSize: FontSize
}

export default function Providers({ children, initialFontSize }: ProvidersProps) {
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
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <CompanyProvider>
          <FontSizeProvider initialSize={initialFontSize}>
            {children}
            <Toaster richColors position="top-right" />
          </FontSizeProvider>
        </CompanyProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
