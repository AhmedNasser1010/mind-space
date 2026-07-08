"use client"

import { memo, useCallback, useEffect, useRef, useState } from "react"
import { useStore } from "@/store"
import { InlineInput } from "@/components/ui/icon-button"

export const TextWidget = memo(function TextWidget({ widgetId }: { widgetId: string }) {
  const widget = useStore((s) => s.widgets[widgetId])
  const updateWidget = useStore((s) => s.updateWidget)
  const inputRef = useRef<HTMLInputElement>(null)
  const [localTitle, setLocalTitle] = useState<string | null>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const title = localTitle ?? widget?.title ?? "Label"

  useEffect(() => {
    setLocalTitle(null)
  }, [widget?.title])

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  const handleChange = useCallback(
    (value: string) => {
      setLocalTitle(value)

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      saveTimeoutRef.current = setTimeout(() => {
        updateWidget(widgetId, { title: value })
        setLocalTitle(null)
        saveTimeoutRef.current = null
      }, 400)
    },
    [updateWidget, widgetId]
  )

  const handleCommit = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }
    updateWidget(widgetId, { title })
    setLocalTitle(null)
  }, [title, updateWidget, widgetId])

  const handleCancel = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }
    setLocalTitle(null)
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
  }, [])

  if (!widget) return null

  return (
    <div className="flex h-full items-center p-4">
      <InlineInput
        inputRef={inputRef}
        value={title}
        onChange={handleChange}
        placeholder="Label"
        onEnter={handleCommit}
        onEscape={handleCancel}
        onBlur={handleCommit}
        onPointerDown={handlePointerDown}
        autoFocus={false}
        className="h-auto w-full border-0 bg-transparent px-0 py-0 text-3xl font-semibold leading-tight tracking-tight text-foreground shadow-none focus:ring-0"
      />
    </div>
  )
})
