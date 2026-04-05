"use client"

import * as React from "react"
import { Star } from "lucide-react"

import { cn } from "react/lib/utils"

type StarRatingProps = {
  value: number
  onChange?: (value: number) => void
  readonly?: boolean
  size?: "sm" | "md"
  label?: string
}

export function StarRating({ value, onChange, readonly = false, size = "md", label }: StarRatingProps) {
  const [hovered, setHovered] = React.useState(0)
  const starSize = size === "sm" ? "size-4" : "size-6"

  return (
    <div className="flex flex-col gap-1">
      {label && <span className="text-sm font-medium">{label}</span>}
      <div className="flex gap-1" role="group" aria-label={label ?? "Calificación"}>
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= (hovered || value)
          return (
            <button
              key={star}
              type="button"
              disabled={readonly}
              onClick={() => onChange?.(star)}
              onMouseEnter={() => !readonly && setHovered(star)}
              onMouseLeave={() => !readonly && setHovered(0)}
              aria-label={`${star} estrella${star !== 1 ? "s" : ""}`}
              className={cn(
                "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                readonly ? "cursor-default" : "cursor-pointer"
              )}
            >
              <Star
                className={cn(
                  starSize,
                  filled ? "fill-yellow-400 text-yellow-400" : "fill-none text-muted-foreground",
                  !readonly && "hover:text-yellow-400"
                )}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
