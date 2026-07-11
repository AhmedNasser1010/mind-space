"use client"

import { useCallback, useRef } from "react"
import { useStore } from "@/store"
import { useInteractionStore } from "@/store/interaction"
import { computeSnap, SNAP_THRESHOLD_PX, type Rect } from "@/lib/snap-align"

const setGuides = useInteractionStore.getState().setGuides

export function useWidgetDrag(widgetId: string) {
  const isDragging = useRef(false)
  const startPos = useRef({ x: 0, y: 0 })
  const widgetsStart = useRef<Record<string, { x: number; y: number }>>({})
  const dragIds = useRef<string[]>([])
  const candidates = useRef<Rect[]>([])
  const unionStart = useRef<Rect>({ x: 0, y: 0, width: 0, height: 0 })

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

        const dragIdSet = new Set(dragIds.current)
        const sheet = state.sheets.find((s) => s.id === state.currentSheetId)
        candidates.current = (sheet?.widgetOrder ?? [])
          .filter((id) => !dragIdSet.has(id))
          .map((id) => state.widgets[id])
          .filter((w): w is NonNullable<typeof w> => Boolean(w))
          .map((w) => ({ x: w.x, y: w.y, width: w.width, height: w.height }))

        let minX = Infinity
        let minY = Infinity
        let maxX = -Infinity
        let maxY = -Infinity
        for (const id of dragIds.current) {
          const w = state.widgets[id]
          if (!w) continue
          minX = Math.min(minX, w.x)
          minY = Math.min(minY, w.y)
          maxX = Math.max(maxX, w.x + w.width)
          maxY = Math.max(maxY, w.y + w.height)
        }
        unionStart.current = { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
      }

      const dx =
        (e.clientX - startPos.current.x) / state.canvasState.scale
      const dy =
        (e.clientY - startPos.current.y) / state.canvasState.scale

      const snapEnabled = state.canvasState.snapToObjects !== false && !(e.metaKey || e.ctrlKey)
      let snapDx = 0
      let snapDy = 0
      let snappedX = false
      let snappedY = false
      if (snapEnabled) {
        const movingNow: Rect = {
          x: unionStart.current.x + dx,
          y: unionStart.current.y + dy,
          width: unionStart.current.width,
          height: unionStart.current.height,
        }
        const result = computeSnap(movingNow, candidates.current, SNAP_THRESHOLD_PX / state.canvasState.scale)
        snapDx = result.dx
        snapDy = result.dy
        snappedX = result.snappedX
        snappedY = result.snappedY
        setGuides(result.guides)
      } else {
        setGuides([])
      }

      const grid = state.canvasState.gridSize
      for (const [id, start] of Object.entries(widgetsStart.current)) {
        let newX = start.x + dx + snapDx
        let newY = start.y + dy + snapDy

        if (state.canvasState.snapToGrid && !(e.metaKey || e.ctrlKey)) {
          if (!snappedX) newX = Math.round(newX / grid) * grid
          if (!snappedY) newY = Math.round(newY / grid) * grid
        }

        state.moveWidget(id, newX, newY)
      }
    },
    [widgetId]
  )

  const handlePointerUp = useCallback(() => {
    isDragging.current = false
    candidates.current = []
    setGuides([])
  }, [])

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerUp,
  }
}
