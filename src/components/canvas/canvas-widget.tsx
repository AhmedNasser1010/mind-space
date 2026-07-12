"use client"

import { memo } from "react"
import { useStore } from "@/store"
import type { WidgetType } from "@/types"
import { BaseWidget } from "@/components/widgets/base-widget"
import { widgetComponents } from "@/components/widgets/widget-registry"

interface CanvasWidgetProps {
  widgetId: string
}

export const CanvasWidget = memo(function CanvasWidget({ widgetId }: CanvasWidgetProps) {
  const widget = useStore((s) => s.widgets[widgetId])
  if (!widget) return null

  const { type, title } = widget
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
