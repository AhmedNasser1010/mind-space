"use client"

import { memo, useCallback, useMemo, useRef, useState } from "react"
import { useStore } from "@/store"
import { getWidgetData } from "@/lib/widget-utils"

interface NoteData {
  content: string
}

export const NoteWidget = memo(function NoteWidget({ widgetId }: { widgetId: string }) {
  const widget = useStore((s) => s.widgets[widgetId])
  const updateWidget = useStore((s) => s.updateWidget)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [localContent, setLocalContent] = useState<string | null>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const data = useMemo(() => getWidgetData<NoteData>(widget), [widget])
  const content = localContent ?? data.content ?? ""

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value
      setLocalContent(value)

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      saveTimeoutRef.current = setTimeout(() => {
        updateWidget(widgetId, {
          data: { content: value },
        })
        setLocalContent(null)
      }, 400)
    },
    [updateWidget, widgetId]
  )

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
  }, [])

  return (
    <div className="flex h-full flex-col p-3">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        onPointerDown={handlePointerDown}
        placeholder="Type your notes here..."
        className="flex-1 resize-none rounded-md border-0 bg-transparent p-0 text-xs leading-relaxed text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-0"
      />
    </div>
  )
})