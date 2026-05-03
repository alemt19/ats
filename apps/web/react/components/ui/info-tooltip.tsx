"use client"

import { Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "react/components/ui/tooltip"

export default function InfoTooltip({ text }: { text: string }) {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Info className="size-3.5 cursor-help text-foreground/40 transition-colors hover:text-foreground/60" />
                </TooltipTrigger>
                <TooltipContent className="max-w-52">
                    {text}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}
