"use client"

import { memo } from "react"
import { createPortal } from "react-dom"
import { useInteractionStore } from "@/store/interaction"
import { GripVertical } from "lucide-react"

export const FlexBoxDragOverlay = memo(function FlexBoxDragOverlay() {
  const flexboxDnd = useInteractionStore((s) => s.flexboxDnd)

  if (!flexboxDnd.dragging || !flexboxDnd.position) return null

  const { position, cardContent } = flexboxDnd

  return createPortal(
    <div
      className="pointer-events-none fixed z-[9999] w-56 rounded-md border bg-background p-1.5 shadow-lg opacity-80"
      style={{
        left: position.x + 12,
        top: position.y + 12,
      }}
    >
      <div className="flex items-start gap-1">
        <GripVertical className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
        <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap break-words line-clamp-4">
          {cardContent || (
            <span className="text-muted-foreground/40 italic">Empty card</span>
          )}
        </p>
      </div>
    </div>,
    document.body,
  )
})
