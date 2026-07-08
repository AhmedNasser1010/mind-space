"use client"

import { memo } from "react"
import type { ResizeDirection } from "@/hooks/use-widget-resize"
import { useWidgetResize } from "@/hooks/use-widget-resize"

interface SelectionOutlineProps {
  widgetId: string
}

const directions: { dir: ResizeDirection; style: string }[] = [
  { dir: "n", style: "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-n-resize" },
  { dir: "s", style: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-s-resize" },
  { dir: "e", style: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-e-resize" },
  { dir: "w", style: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-w-resize" },
  { dir: "ne", style: "top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-ne-resize" },
  { dir: "nw", style: "top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nw-resize" },
  { dir: "se", style: "bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-se-resize" },
  { dir: "sw", style: "bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-sw-resize" },
]

const ResizeHandle = memo(function ResizeHandle({
  widgetId,
  dir,
  className,
}: {
  widgetId: string
  dir: ResizeDirection
  className: string
}) {
  const handlers = useWidgetResize(widgetId, dir)

  return (
    <div
      {...handlers}
      className={`absolute z-10 flex items-center justify-center ${className}`}
      style={{ touchAction: "none", width: 28, height: 28, margin: -14 }}
    >
      <div className="h-3 w-3 rounded-full border-2 border-primary bg-background shadow-sm pointer-events-none" />
    </div>
  )
})

export const SelectionOutline = memo(function SelectionOutline({ widgetId }: SelectionOutlineProps) {
  return (
    <>
      <div
        className="absolute inset-0 rounded-xl border-2 border-primary pointer-events-none"
        style={{ outline: "none" }}
      />
      {directions.map(({ dir, style }) => (
        <ResizeHandle
          key={dir}
          widgetId={widgetId}
          dir={dir}
          className={style}
        />
      ))}
    </>
  )
})
