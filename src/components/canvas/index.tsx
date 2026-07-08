"use client"

import { useCallback, useMemo, useRef } from "react"
import { useStore } from "@/store"
import type { WidgetType } from "@/types"
import { BaseWidget } from "@/components/widgets/base-widget"
import { widgetComponents } from "@/components/widgets/widget-registry"
import { EmptyState } from "@/components/ui/empty-state"
import { ZoomControls } from "./zoom-controls"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { LayoutTemplate } from "lucide-react"

export function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const isPanning = useRef(false)
  const lastPointer = useRef({ x: 0, y: 0 })

  const currentSheetId = useStore((s) => s.currentSheetId)
  const sheets = useStore((s) => s.sheets)
  const widgetsRecord = useStore((s) => s.widgets)
  const canvasState = useStore((s) => s.canvasState)
  const setCanvasState = useStore((s) => s.setCanvasState)

  useKeyboardShortcuts(containerRef)

  const currentSheet = useMemo(
    () => sheets.find((s) => s.id === currentSheetId),
    [sheets, currentSheetId]
  )

  const sheetWidgets = useMemo(
    () =>
      currentSheet?.widgetOrder
        .map((id) => widgetsRecord[id])
        .filter(Boolean) ?? [],
    [currentSheet?.widgetOrder, widgetsRecord]
  )

  const canvasStateRef = useRef(canvasState)
  canvasStateRef.current = canvasState // eslint-disable-line react-hooks/refs

  const deselectAll = useStore((s) => s.deselectAll)

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-widget]")) return
    deselectAll()
    isPanning.current = true
    lastPointer.current = { x: e.clientX, y: e.clientY }
    e.currentTarget.setPointerCapture(e.pointerId)
    document.body.style.cursor = "grabbing"
    document.body.style.userSelect = "none"
  }, [deselectAll])

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isPanning.current) return
      const state = canvasStateRef.current
      const dx = (e.clientX - lastPointer.current.x) / state.scale
      const dy = (e.clientY - lastPointer.current.y) / state.scale
      lastPointer.current = { x: e.clientX, y: e.clientY }
      setCanvasState({
        offsetX: state.offsetX + dx,
        offsetY: state.offsetY + dy,
      })
    },
    [setCanvasState]
  )

  const handlePointerUp = useCallback(() => {
    isPanning.current = false
    document.body.style.cursor = ""
    document.body.style.userSelect = ""
  }, [])

  const spacing = canvasState.gridSize * canvasState.scale
  const showGrid = canvasState.gridEnabled && spacing >= 4

  const gridStyle = useMemo(() => {
    if (!showGrid) return undefined
    return {
      position: "absolute" as const,
      left: 0,
      top: 0,
      width: "100%",
      height: "100%",
      pointerEvents: "none" as const,
      backgroundImage: [
        "linear-gradient(to right, hsl(var(--border) / 0.3) 1px, transparent 1px)",
        "linear-gradient(to bottom, hsl(var(--border) / 0.3) 1px, transparent 1px)",
      ].join(", "),
      backgroundSize: `${spacing}px ${spacing}px`,
      backgroundPosition: `${canvasState.offsetX % spacing}px ${canvasState.offsetY % spacing}px`,
    } satisfies React.CSSProperties
  }, [showGrid, spacing, canvasState.offsetX, canvasState.offsetY])

  return (
    <div
      ref={containerRef}
      className="h-full overflow-hidden relative bg-background"
      style={{ touchAction: "none" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {gridStyle && <div style={gridStyle} />}

      <div
        className="absolute left-0 top-0"
        style={{
          transform: `translate(${canvasState.offsetX}px, ${canvasState.offsetY}px) scale(${canvasState.scale})`,
          transformOrigin: "0 0",
          willChange: "transform",
        }}
      >
        {sheetWidgets.map((widget) => {
          const WidgetComponent = widgetComponents[widget.type as WidgetType]
          return (
            <div key={widget.id} data-widget>
              <BaseWidget widgetId={widget.id} hideTitle={widget.type === "text"}>
                {WidgetComponent ? (
                  <WidgetComponent widgetId={widget.id} />
                ) : (
                  <div className="flex h-full flex-col p-4">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
                      {widget.type}
                    </span>
                    <span className="mt-1.5 text-sm font-semibold leading-tight">
                      {widget.title}
                    </span>
                  </div>
                )}
              </BaseWidget>
            </div>
          )
        })}
      </div>

      {sheetWidgets.length === 0 && currentSheetId && (
        <EmptyState
          icon={<LayoutTemplate className="h-6 w-6" />}
          title="Canvas is empty"
          description="Add a widget to get started"
        />
      )}

      {!currentSheetId && (
        <EmptyState
          icon={<LayoutTemplate className="h-6 w-6" />}
          title="No sheet selected"
          description="Create or select a sheet from the sidebar"
        />
      )}

      <ZoomControls />
    </div>
  )
}
