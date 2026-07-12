"use client"

import { useMemo, useRef } from "react"
import { useStore } from "@/store"
import { EmptyState } from "@/components/ui/empty-state"
import { ZoomControls } from "./zoom-controls"
import { CanvasWidget } from "./canvas-widget"
import { MarqueeOverlay } from "./marquee-overlay"
import { SnapGuides } from "./snap-guides"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { useCanvasGestures } from "@/hooks/use-canvas-gestures"
import { LayoutTemplate } from "lucide-react"

export function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null)

  const currentSheetId = useStore((s) => s.currentSheetId)
  const widgetOrder = useStore((s) => s.sheets.find((sh) => sh.id === s.currentSheetId)?.widgetOrder)
  const canvasState = useStore((s) => s.canvasState)
  const canvasAnimating = useStore((s) => s.canvasAnimating)

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
        <MarqueeOverlay />
      </div>

      <SnapGuides />

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
