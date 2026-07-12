"use client"

import { useCallback, useRef } from "react"
import { useStore } from "@/store"

export function useWidgetDrag(widgetId: string) {
  const isDragging = useRef(false)
  const startPos = useRef({ x: 0, y: 0 })
  const widgetsStart = useRef<Record<string, { x: number; y: number }>>({})
  const dragIds = useRef<string[]>([])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const state = useStore.getState()
      const widget = state.widgets[widgetId]
      if (!widget) return

      isDragging.current = true
      startPos.current = { x: e.clientX, y: e.clientY }
      dragIds.current = []
      widgetsStart.current = {}
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [widgetId]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return

      const state = useStore.getState()

      if (dragIds.current.length === 0) {
        useStore.getState().recordSnapshot()

        const selectedIds = state.selectedWidgetIds
        dragIds.current =
          selectedIds.includes(widgetId) && selectedIds.length > 1
            ? selectedIds
            : [widgetId]

        for (const id of dragIds.current) {
          const w = state.widgets[id]
          if (w) {
            widgetsStart.current[id] = { x: w.x, y: w.y }
          }
        }
      }

      const dx =
        (e.clientX - startPos.current.x) / state.canvasState.scale
      const dy =
        (e.clientY - startPos.current.y) / state.canvasState.scale

      for (const [id, start] of Object.entries(widgetsStart.current)) {
        let newX = start.x + dx
        let newY = start.y + dy

        if (state.canvasState.snapToGrid) {
          const grid = state.canvasState.gridSize
          newX = Math.round(newX / grid) * grid
          newY = Math.round(newY / grid) * grid
        }

        state.moveWidget(id, newX, newY)
      }
    },
    [widgetId]
  )

  const handlePointerUp = useCallback(() => {
    isDragging.current = false
  }, [])

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerUp,
  }
}
