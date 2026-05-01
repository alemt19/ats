"use client"

import * as React from "react"
import { FontSizeSchema, type FontSize } from "@repo/schema"

const BACKEND_URL = process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost:4000"

type FontSizeContextValue = {
  fontSize: FontSize
  changeFontSize: (fontSize: FontSize) => Promise<void>
}

const FONT_SIZE_TO_ROOT_PX: Record<FontSize, string> = {
  small: "14px",
  medium: "16px",
  large: "18px",
}

const FontSizeContext = React.createContext<FontSizeContextValue | undefined>(undefined)

function applyFontSize(fontSize: FontSize) {
  document.documentElement.style.fontSize = FONT_SIZE_TO_ROOT_PX[fontSize]
}

function normalizeFontSize(value: unknown): FontSize {
  const parsed = FontSizeSchema.safeParse(value)
  return parsed.success ? parsed.data : "medium"
}

export function FontSizeProvider({
  children,
  initialSize = "medium",
}: {
  children: React.ReactNode
  initialSize?: FontSize
}) {
  const [fontSize, setFontSize] = React.useState<FontSize>(normalizeFontSize(initialSize))

  React.useEffect(() => {
    applyFontSize(fontSize)
  }, [fontSize])

  React.useEffect(() => {
    setFontSize(normalizeFontSize(initialSize))
  }, [initialSize])

  const changeFontSize = React.useCallback(
    async (nextFontSize: FontSize) => {
      const previousFontSize = fontSize
      setFontSize(nextFontSize)

      try {
        const response = await fetch(`${BACKEND_URL}/api/auth/font-size`, {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ font_size: nextFontSize }),
        })

        if (!response.ok) {
          throw new Error("No se pudo guardar el tamaño de letra")
        }
      } catch (error) {
        setFontSize(previousFontSize)
        throw error
      }
    },
    [fontSize]
  )

  const value = React.useMemo(
    () => ({
      fontSize,
      changeFontSize,
    }),
    [changeFontSize, fontSize]
  )

  return <FontSizeContext.Provider value={value}>{children}</FontSizeContext.Provider>
}

export function useFontSize() {
  const context = React.useContext(FontSizeContext)

  if (!context) {
    throw new Error("useFontSize must be used within a FontSizeProvider")
  }

  return context
}