"use client"

import { memo, useCallback, useRef, useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { GripVertical, X, GripHorizontal } from "lucide-react"

export interface FlexBoxCardData {
  id: string
  content: string
  order: string
  rows?: number
}

interface FlexBoxCardProps {
  card: FlexBoxCardData
  isDragging: boolean
  isDropTarget: boolean
  dropPosition: "before" | "after" | null
  onDragStart: (e: React.PointerEvent, cardId: string) => void
  onContentChange: (cardId: string, content: string) => void
  onResize: (cardId: string, rows: number) => void
  onDelete: (cardId: string) => void
}

export const FlexBoxCard = memo(function FlexBoxCard({
  card,
  isDragging,
  isDropTarget,
  dropPosition,
  onDragStart,
  onContentChange,
  onResize,
  onDelete,
}: FlexBoxCardProps) {
  const [localContent, setLocalContent] = useState<string | null>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const content = localContent ?? card.content ?? ""

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }
      if (localContent !== null) {
        onContentChange(card.id, localContent)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- flush on unmount only

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value
      setLocalContent(value)

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      saveTimeoutRef.current = setTimeout(() => {
        onContentChange(card.id, value)
        setLocalContent(null)
      }, 400)
    },
    [card.id, onContentChange]
  )

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
  }, [])

  const cardRows = card.rows ?? 2

  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      e.preventDefault()

      const startY = e.clientY
      const startRows = cardRows

      const handlePointerMove = (ev: PointerEvent) => {
        const dy = ev.clientY - startY
        const rowHeight = 20
        const deltaRows = Math.round(dy / rowHeight)
        const newRows = Math.max(1, Math.min(12, startRows + deltaRows))
        if (newRows !== cardRows) {
          onResize(card.id, newRows)
        }
      }

      const handlePointerUp = () => {
        document.removeEventListener("pointermove", handlePointerMove)
        document.removeEventListener("pointerup", handlePointerUp)
      }

      document.addEventListener("pointermove", handlePointerMove)
      document.addEventListener("pointerup", handlePointerUp)
    },
    [card.id, cardRows, onResize]
  )

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onDelete(card.id)
    },
    [card.id, onDelete]
  )

  return (
    <div
      data-card-id={card.id}
      className={cn(
        "group/card relative rounded-md border bg-background transition-colors",
        isDragging && "opacity-40"
      )}
    >
      {isDropTarget && dropPosition === "before" && (
        <div className="pointer-events-none absolute inset-x-1 -top-1 h-0.5 rounded-full bg-primary" />
      )}
      {isDropTarget && dropPosition === "after" && (
        <div className="pointer-events-none absolute inset-x-1 -bottom-1 h-0.5 rounded-full bg-primary" />
      )}

      <div
        onPointerDown={handleResizePointerDown}
        className="absolute bottom-0 right-0 flex h-4 w-4 cursor-snwse-resize items-center justify-center rounded-tl text-muted-foreground/0 transition-opacity group-hover/card:text-muted-foreground/60"
        title="Drag to resize"
        aria-label="Resize card"
      >
        <GripHorizontal className="h-3 w-3 rotate-[-30deg]" />
      </div>

      <div className="flex items-start gap-1 p-1.5">
        <button
          onPointerDown={(e) => {
            e.stopPropagation()
            onDragStart(e, card.id)
          }}
          className="mt-1 flex h-5 w-5 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-foreground/0 transition-opacity group-hover/card:text-muted-foreground/60 active:cursor-grabbing"
          title="Drag to reorder"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-3 w-3" />
        </button>

        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onPointerDown={handlePointerDown}
          placeholder="Type something..."
          className="flex-1 resize-none rounded border-0 bg-transparent p-0.5 text-xs leading-relaxed text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-0"
          rows={cardRows}
        />

        <button
          onClick={handleDelete}
          onPointerDown={handlePointerDown}
          className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground/0 transition-opacity hover:text-destructive group-hover/card:text-muted-foreground/60"
          title="Delete card"
          aria-label="Delete card"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
})
