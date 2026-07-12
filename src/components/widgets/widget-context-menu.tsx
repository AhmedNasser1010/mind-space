"use client"

import { memo, useEffect, useRef, useState } from "react"
import { useStore } from "@/store"
import { Copy, Trash2, Palette, ChevronLeft } from "lucide-react"
import { WidgetColorPalette } from "./widget-color-palette"

interface WidgetContextMenuProps {
  widgetId: string
  open: boolean
  x: number
  y: number
  onClose: () => void
  onStartRename: () => void
}

function handleAction(
  widgetId: string,
  selectedIds: string[],
  onClose: () => void,
  action: (id: string) => void,
  multiAction?: (ids: string[]) => void
) {
  const isMulti = selectedIds.includes(widgetId) && selectedIds.length > 1
  if (isMulti && multiAction) {
    multiAction(selectedIds)
  } else {
    action(widgetId)
  }
  onClose()
}

function useOutsideClick(ref: React.RefObject<HTMLDivElement | null>, open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open, onClose, ref])
}

function useMenuKeyboard(
  ref: React.RefObject<HTMLDivElement | null>,
  open: boolean,
  onClose: () => void
) {
  useEffect(() => {
    if (!open) return
    const menu = ref.current
    if (!menu) return
    const firstButton = menu.querySelector("button") as HTMLButtonElement | null
    firstButton?.focus()

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
        return
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault()
        const buttons = menu.querySelectorAll("button")
        const current = document.activeElement as HTMLButtonElement | null
        const currentIndex = Array.from(buttons).indexOf(current!)
        const nextIndex =
          e.key === "ArrowDown"
            ? Math.min(currentIndex + 1, buttons.length - 1)
            : Math.max(currentIndex - 1, 0)
        ;(buttons[nextIndex] as HTMLButtonElement)?.focus()
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open, onClose, ref])
}

export const WidgetContextMenu = memo(function WidgetContextMenu({
  widgetId,
  open,
  x,
  y,
  onClose,
  onStartRename,
}: WidgetContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  const selectedWidgetIds = useStore((s) => s.selectedWidgetIds)
  const widget = useStore((s) => s.widgets[widgetId])
  const [showPalette, setShowPalette] = useState(false)

  useEffect(() => {
    if (!open) setShowPalette(false)
  }, [open])

  useOutsideClick(ref, open, onClose)
  useMenuKeyboard(ref, open, onClose)

  if (!open) return null

  return (
    <div
      ref={ref}
      role="menu"
      className="fixed z-50 min-w-[176px] rounded-lg border bg-popover p-1 shadow-md menu-enter origin-top-left"
      style={{ left: x, top: y }}
    >
      {showPalette ? (
        <>
          <button
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            onClick={() => setShowPalette(false)}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back
          </button>
          <div className="h-px bg-border my-1" />
          <WidgetColorPalette
            currentId={widget?.colorTheme}
            onSelect={(id) => {
              useStore.getState().updateWidget(widgetId, {
                colorTheme: id === "default" ? undefined : id,
              })
              onClose()
            }}
          />
        </>
      ) : (
        <>
          <button
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
            onClick={() => {
              onStartRename()
              onClose()
            }}
          >
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            </svg>
            Rename
          </button>
          <button
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
            onClick={() => {
              const s = useStore.getState()
              if (!s.currentSheetId) return
              handleAction(
                widgetId,
                selectedWidgetIds,
                onClose,
                (id) => s.duplicateWidget(s.currentSheetId!, id),
                (ids) => s.duplicateWidgets(s.currentSheetId!, ids)
              )
            }}
          >
            <Copy className="h-3.5 w-3.5" />
            Duplicate
          </button>
          <div className="h-px bg-border my-1" />
          <button
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
            onClick={() => setShowPalette(true)}
          >
            <Palette className="h-3.5 w-3.5" />
            Color
          </button>
          <div className="h-px bg-border my-1" />
          <button
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            onClick={() => {
              const s = useStore.getState()
              if (!s.currentSheetId) return
              handleAction(
                widgetId,
                selectedWidgetIds,
                onClose,
                (id) => s.deleteWidgetAnimated(s.currentSheetId!, id),
                (ids) => s.deleteWidgetsAnimated(s.currentSheetId!, ids)
              )
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </>
      )}
    </div>
  )
})
