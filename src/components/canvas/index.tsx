"use client"

import { useMemo, useRef, memo } from "react"
import { useStore } from "@/store"
import type { WidgetType } from "@/types"
import { BaseWidget } from "@/components/widgets/base-widget"
import { widgetComponents } from "@/components/widgets/widget-registry"
import { EmptyState } from "@/components/ui/empty-state"
import { ZoomControls } from "./zoom-controls"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { useCanvasGestures } from "@/hooks/use-canvas-gestures"
import { LayoutTemplate } from "lucide-react"

export function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const isPanning = useRef(false)
  const lastPointer = useRef({ x: 0, y: 0 })
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map())
  const isPinching = useRef(false)
  const initialPinchDist = useRef(0)

  const currentSheetId = useStore((s) => s.currentSheetId)
  const sheets = useStore((s) => s.sheets)
  const widgetsRecord = useStore((s) => s.widgets)
  const canvasState = useStore((s) => s.canvasState)
  const setCanvasState = useStore((s) => s.setCanvasState)
  const canvasAnimating = useStore((s) => s.canvasAnimating)

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
    if (useStore.getState().canvasAnimating) useStore.getState().setCanvasAnimating(false)
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

  const WidgetComponent = widgetComponents[type as WidgetType]

  return (
    <div data-widget>
      <BaseWidget widgetId={widgetId} hideTitle={type === "text"}>
        {WidgetComponent ? (
          <WidgetComponent widgetId={widgetId} />
        ) : (
          <div className="flex h-full flex-col p-4">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
              {type}
            </span>
            <span className="mt-1.5 text-sm font-semibold leading-tight">
              {title}
            </span>
          </div>
        )}
      </BaseWidget>
    </div>
  )
})

export function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null)

  const currentSheetId = useStore((s) => s.currentSheetId)
  const widgetOrder = useStore((s) => s.sheets.find((sh) => sh.id === s.currentSheetId)?.widgetOrder)
  const canvasState = useStore((s) => s.canvasState)

  useKeyboardShortcuts()
  const { onPointerDown, onPointerMove, onPointerUp, onPointerCancel } = useCanvasGestures(containerRef)

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
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      {gridStyle && <div style={gridStyle} />}

      <div
        className="absolute left-0 top-0"
        style={{
          transform: `translate(${canvasState.offsetX}px, ${canvasState.offsetY}px) scale(${canvasState.scale})`,
          transformOrigin: "0 0",
          willChange: "transform",
          transition: canvasAnimating ? "transform 200ms var(--ease-in-out)" : "none",
        }}
      >
        {widgetOrder?.map((id) => (
          <CanvasWidget key={id} widgetId={id} />
        ))}
      </div>

      {widgetOrder?.length === 0 && currentSheetId && (
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
