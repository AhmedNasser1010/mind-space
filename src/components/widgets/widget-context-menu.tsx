"use client"

import { memo } from "react"
import { ContextMenu } from "@base-ui/react/context-menu"
import { useStore } from "@/store"
import { Copy, Trash2, Palette, ChevronRight, Pencil } from "lucide-react"
import { WidgetColorPalette } from "./widget-color-palette"

interface WidgetContextMenuProps {
  widgetId: string
  onStartRename: () => void
  children: React.ReactElement
}

const itemClass =
  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground transition-colors"
const destructiveItemClass =
  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-destructive outline-none data-[highlighted]:bg-destructive/10 transition-colors"
const popupClass =
  "z-50 min-w-[176px] rounded-lg border bg-popover p-1 shadow-md outline-none"

export const WidgetContextMenu = memo(function WidgetContextMenu({
  widgetId,
  onStartRename,
  children,
}: WidgetContextMenuProps) {
  const isMulti = useStore(
    (s) => s.selectedWidgetIds.includes(widgetId) && s.selectedWidgetIds.length > 1
  )
  const count = useStore((s) => s.selectedWidgetIds.length)
  const widget = useStore((s) => s.widgets[widgetId])

  if (!widget) return children

  function applyColor(id: string) {
    const s = useStore.getState()
    const colorTheme = id === "default" ? undefined : id
    if (isMulti) {
      s.updateWidgets(s.selectedWidgetIds, { colorTheme })
    } else {
      s.updateWidget(widgetId, { colorTheme })
    }
  }

  function duplicate() {
    const s = useStore.getState()
    if (!s.currentSheetId) return
    if (isMulti) {
      s.duplicateWidgets(s.currentSheetId, s.selectedWidgetIds)
    } else {
      s.duplicateWidget(s.currentSheetId, widgetId)
    }
  }

  function remove() {
    const s = useStore.getState()
    if (!s.currentSheetId) return
    if (isMulti) {
      s.deleteWidgets(s.currentSheetId, s.selectedWidgetIds)
    } else {
      s.deleteWidget(s.currentSheetId, widgetId)
    }
  }

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger render={children} />
      <ContextMenu.Portal>
        <ContextMenu.Positioner>
          <ContextMenu.Popup className={popupClass}>
            {!isMulti && (
              <ContextMenu.Item className={itemClass} onClick={onStartRename}>
                <Pencil className="h-3.5 w-3.5" />
                Rename
              </ContextMenu.Item>
            )}
            <ContextMenu.Item className={itemClass} onClick={duplicate}>
              <Copy className="h-3.5 w-3.5" />
              {isMulti ? `Duplicate ${count} widgets` : "Duplicate"}
            </ContextMenu.Item>
            <ContextMenu.Separator className="h-px bg-border my-1" />
            <ContextMenu.SubmenuRoot>
              <ContextMenu.SubmenuTrigger className={itemClass} openOnHover>
                <Palette className="h-3.5 w-3.5" />
                Color
                <ChevronRight className="h-3.5 w-3.5 ml-auto" />
              </ContextMenu.SubmenuTrigger>
              <ContextMenu.Portal>
                <ContextMenu.Positioner side="right" alignOffset={-4} sideOffset={-4}>
                  <ContextMenu.Popup className={popupClass}>
                    <WidgetColorPalette currentId={widget.colorTheme} onSelect={applyColor} />
                  </ContextMenu.Popup>
                </ContextMenu.Positioner>
              </ContextMenu.Portal>
            </ContextMenu.SubmenuRoot>
            <ContextMenu.Separator className="h-px bg-border my-1" />
            <ContextMenu.Item className={destructiveItemClass} onClick={remove}>
              <Trash2 className="h-3.5 w-3.5" />
              {isMulti ? `Delete ${count} widgets` : "Delete"}
            </ContextMenu.Item>
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
})
