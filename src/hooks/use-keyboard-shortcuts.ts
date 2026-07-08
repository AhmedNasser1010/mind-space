"use client"

import { useEffect, useRef } from "react"
import { useStore } from "@/store"

export function useKeyboardShortcuts(containerRef: React.RefObject<HTMLDivElement | null>) {
  const spaceHeld = useRef(false)
  const isPanning = useRef(false)
  const lastPointer = useRef({ x: 0, y: 0 })
  const spacePanStartedAt = useRef(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable
      const mod = e.metaKey || e.ctrlKey

      if (e.code === "Space" && !isInput) {
        e.preventDefault()
        if (!spaceHeld.current) {
          spaceHeld.current = true
          container.style.cursor = "grab"
        }
        return
      }

      if ((e.key === "Backspace" || e.key === "Delete") && !isInput) {
        const s = useStore.getState()
        if (s.selectedWidgetIds.length > 0 && s.currentSheetId) {
          e.preventDefault()
          s.deleteWidgets(s.currentSheetId, s.selectedWidgetIds)
        }
        return
      }

      if (mod && e.key === "z" && !e.shiftKey && !isInput) {
        e.preventDefault()
        useStore.getState().undo()
        return
      }

      if (mod && e.key === "z" && e.shiftKey && !isInput) {
        e.preventDefault()
        useStore.getState().redo()
        return
      }

      if (mod && e.key === "Z" && !isInput) {
        e.preventDefault()
        useStore.getState().redo()
        return
      }

      if (mod && (e.key === "d" || e.key === "D") && !isInput) {
        e.preventDefault()
        const s = useStore.getState()
        if (s.selectedWidgetIds.length > 0 && s.currentSheetId) {
          s.duplicateWidgets(s.currentSheetId, s.selectedWidgetIds)
        }
        return
      }

      if (mod && (e.key === "c" || e.key === "C") && !isInput) {
        e.preventDefault()
        const s = useStore.getState()
        if (s.selectedWidgetIds.length > 0 && s.currentSheetId) {
          s.copyWidgets(s.currentSheetId, s.selectedWidgetIds)
        }
        return
      }

      if (mod && (e.key === "v" || e.key === "V") && !isInput) {
        e.preventDefault()
        const s = useStore.getState()
        if (s.clipboard && s.currentSheetId) {
          s.pasteWidgets(s.currentSheetId)
        }
        return
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceHeld.current = false
        if (isPanning.current) {
          isPanning.current = false
          container.style.cursor = ""
        } else {
          container.style.cursor = ""
        }
      }
    }

    const handlePointerDown = (e: PointerEvent) => {
      if (spaceHeld.current) {
        isPanning.current = true
        lastPointer.current = { x: e.clientX, y: e.clientY }
        container.setPointerCapture(e.pointerId)
        container.style.cursor = "grabbing"
        container.style.userSelect = "none"
        spacePanStartedAt.current = Date.now()
      }
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (!isPanning.current) return
      const s = useStore.getState()
      const dx = (e.clientX - lastPointer.current.x) / s.canvasState.scale
      const dy = (e.clientY - lastPointer.current.y) / s.canvasState.scale
      lastPointer.current = { x: e.clientX, y: e.clientY }
      s.setCanvasState({
        offsetX: s.canvasState.offsetX + dx,
        offsetY: s.canvasState.offsetY + dy,
      })
    }

    const handlePointerUp = () => {
      if (isPanning.current) {
        isPanning.current = false
        container.style.cursor = spaceHeld.current ? "grab" : ""
        container.style.userSelect = ""
      }
    }

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const s = useStore.getState()
      const rect = container.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      const zoomFactor = Math.exp(-e.deltaY * 0.001)
      const newScale = Math.min(Math.max(s.canvasState.scale * zoomFactor, 0.1), 5)
      const scaleChange = newScale / s.canvasState.scale
      s.setCanvasState({
        scale: newScale,
        offsetX: mouseX - (mouseX - s.canvasState.offsetX) * scaleChange,
        offsetY: mouseY - (mouseY - s.canvasState.offsetY) * scaleChange,
      })
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    container.addEventListener("pointerdown", handlePointerDown)
    container.addEventListener("pointermove", handlePointerMove)
    container.addEventListener("pointerup", handlePointerUp)
    container.addEventListener("pointercancel", handlePointerUp)
    container.addEventListener("wheel", handleWheel, { passive: false })

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
      container.removeEventListener("pointerdown", handlePointerDown)
      container.removeEventListener("pointermove", handlePointerMove)
      container.removeEventListener("pointerup", handlePointerUp)
      container.removeEventListener("pointercancel", handlePointerUp)
      container.removeEventListener("wheel", handleWheel)
    }
  }, [containerRef])
}
