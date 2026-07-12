"use client"

import { useCallback, useEffect, useRef } from "react"
import { useStore } from "@/store"

export function useCanvasGestures(containerRef: React.RefObject<HTMLDivElement | null>) {
  const spaceHeld = useRef(false)
  const isPanning = useRef(false)
  const lastPointer = useRef({ x: 0, y: 0 })
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map())
  const isPinching = useRef(false)
  const initialPinchDist = useRef(0)

  const canvasState = useStore((s) => s.canvasState)
  const canvasStateRef = useRef(canvasState)
  canvasStateRef.current = canvasState // eslint-disable-line react-hooks/refs

  const setCanvasState = useStore((s) => s.setCanvasState)
  const deselectAll = useStore((s) => s.deselectAll)

  const startPinch = useCallback(() => {
    const pointers = Array.from(activePointers.current.values())
    isPinching.current = true
    isPanning.current = false
    initialPinchDist.current = Math.hypot(
      pointers[0].x - pointers[1].x,
      pointers[0].y - pointers[1].y,
    )
  }, [])

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

      if (activePointers.current.size === 2) {
        startPinch()
        document.body.style.cursor = ""
        document.body.style.userSelect = ""
        return
      }

      const onWidget = (e.target as HTMLElement).closest("[data-widget]")
      if (onWidget && !spaceHeld.current) {
        activePointers.current.delete(e.pointerId)
        return
      }

      if (!onWidget) {
        deselectAll()
      }
      isPanning.current = true
      lastPointer.current = { x: e.clientX, y: e.clientY }
      e.currentTarget.setPointerCapture(e.pointerId)

      // Pre-refactor, Canvas's pan handler styled document.body and
      // use-keyboard-shortcuts' space-pan handler styled the container;
      // both listeners were always mounted together, so any qualifying
      // pointerdown set both. Preserve that combined effect here.
      document.body.style.cursor = "grabbing"
      document.body.style.userSelect = "none"
      const container = containerRef.current
      if (container) {
        container.style.cursor = "grabbing"
        container.style.userSelect = "none"
      }
    },
    [containerRef, deselectAll, startPinch]
  )

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (isPinching.current && activePointers.current.size === 2) {
      const pointers = Array.from(activePointers.current.values())
      const dist = Math.hypot(
        pointers[0].x - pointers[1].x,
        pointers[0].y - pointers[1].y,
      )
      const state = canvasStateRef.current
      const newScale = Math.min(
        Math.max(state.scale * (dist / initialPinchDist.current), 0.1),
        5,
      )
      const scaleChange = newScale / state.scale
      const midX = (pointers[0].x + pointers[1].x) / 2
      const midY = (pointers[0].y + pointers[1].y) / 2
      setCanvasState({
        scale: newScale,
        offsetX: midX - (midX - state.offsetX) * scaleChange,
        offsetY: midY - (midY - state.offsetY) * scaleChange,
      })
      return
    }

    if (!isPanning.current) return
    const state = canvasStateRef.current
    const dx = (e.clientX - lastPointer.current.x) / state.scale
    const dy = (e.clientY - lastPointer.current.y) / state.scale
    lastPointer.current = { x: e.clientX, y: e.clientY }
    setCanvasState({
      offsetX: state.offsetX + dx,
      offsetY: state.offsetY + dy,
    })
  }, [setCanvasState])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId)
    if (activePointers.current.size < 2) {
      isPinching.current = false
    }
    if (activePointers.current.size === 0) {
      isPanning.current = false
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
      const container = containerRef.current
      if (container) {
        container.style.cursor = spaceHeld.current ? "grab" : ""
        container.style.userSelect = ""
      }
    }
  }, [containerRef])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Capture-phase pointerdown/up keep activePointers/isPinching in sync
    // even when a gesture starts over a widget (bubble handler bails early
    // on [data-widget] unless Space is held), so two-finger pinch works
    // from anywhere.
    const onCapturePointerDown = (e: PointerEvent) => {
      activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (activePointers.current.size === 2) {
        startPinch()
      }
    }

    const onCapturePointerUp = (e: PointerEvent) => {
      activePointers.current.delete(e.pointerId)
      if (activePointers.current.size < 2) {
        isPinching.current = false
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable

      if (e.code === "Space" && !isInput) {
        e.preventDefault()
        if (!spaceHeld.current) {
          spaceHeld.current = true
          container.style.cursor = "grab"
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceHeld.current = false
        isPanning.current = false
        container.style.cursor = ""
      }
    }

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const state = canvasStateRef.current
      const rect = container.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      const zoomFactor = Math.exp(-e.deltaY * 0.001)
      const newScale = Math.min(Math.max(state.scale * zoomFactor, 0.1), 5)
      const scaleChange = newScale / state.scale
      setCanvasState({
        scale: newScale,
        offsetX: mouseX - (mouseX - state.offsetX) * scaleChange,
        offsetY: mouseY - (mouseY - state.offsetY) * scaleChange,
      })
    }

    container.addEventListener("pointerdown", onCapturePointerDown, true)
    container.addEventListener("pointerup", onCapturePointerUp, true)
    container.addEventListener("pointercancel", onCapturePointerUp, true)
    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    container.addEventListener("wheel", handleWheel, { passive: false })

    return () => {
      container.removeEventListener("pointerdown", onCapturePointerDown, true)
      container.removeEventListener("pointerup", onCapturePointerUp, true)
      container.removeEventListener("pointercancel", onCapturePointerUp, true)
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
      container.removeEventListener("wheel", handleWheel)
    }
  }, [containerRef, setCanvasState, startPinch])

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp }
}
