"use client"

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useStore } from "@/store"
import { useInteractionStore } from "@/store/interaction"
import { getWidgetData } from "@/lib/widget-utils"
import { orderKeyBetween } from "@/lib/order-key"
import { FlexBoxCard, type FlexBoxCardData } from "./flexbox-card"

interface FlexBoxData {
  cards: FlexBoxCardData[]
}

interface DropTarget {
  widgetId: string
  cardId: string
  position: "before" | "after"
}

const AUTOSCROLL_EDGE_PX = 32
const AUTOSCROLL_SPEED = 8
const HIGHLIGHT_CLASSES = ["ring-2", "ring-primary/60", "ring-offset-1", "ring-offset-transparent"]

function findFlexBoxUnderPointer(clientX: number, clientY: number): HTMLElement | null {
  const elements = document.elementsFromPoint(clientX, clientY)
  for (const el of elements) {
    const flexBoxEl = (el as HTMLElement).closest("[data-flexbox-id]")
    if (flexBoxEl) return flexBoxEl as HTMLElement
  }
  return null
}

function computeDropTargetInContainer(
  container: HTMLElement,
  cardId: string,
  clientY: number,
): { cardId: string; position: "before" | "after" } | null {
  const rows = Array.from(container.querySelectorAll<HTMLElement>("[data-card-id]"))
  if (rows.length === 0) return null

  const candidates = rows.filter((row) => row.getAttribute("data-card-id") !== cardId)
  if (candidates.length === 0) return null

  let best: { cardId: string; position: "before" | "after" } | null = null
  let bestDist = Infinity

  for (const row of candidates) {
    const rowId = row.getAttribute("data-card-id")!
    const rect = row.getBoundingClientRect()
    const mid = rect.top + rect.height / 2
    const dist = Math.abs(clientY - mid)
    if (dist < bestDist) {
      bestDist = dist
      best = { cardId: rowId, position: clientY < mid ? "before" : "after" }
    }
  }

  return best
}

export const FlexBoxWidget = memo(function FlexBoxWidget({ widgetId }: { widgetId: string }) {
  const widget = useStore((s) => s.widgets[widgetId])
  const updateWidget = useStore((s) => s.updateWidget)
  const moveFlexBoxCard = useStore((s) => s.moveFlexBoxCard)
  const recordSnapshot = useStore((s) => s.recordSnapshot)

  const setFlexboxDnd = useInteractionStore((s) => s.setFlexboxDnd)
  const clearFlexboxDnd = useInteractionStore((s) => s.clearFlexboxDnd)

  const [localDropTarget, setLocalDropTarget] = useState<DropTarget | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const autoscrollFrame = useRef<number | null>(null)
  const pendingScrollDir = useRef(0)

  const data = useMemo(() => getWidgetData<FlexBoxData>(widget), [widget])

  const sortedCards = useMemo(() => {
    const cards = data.cards ?? []
    return [...cards].sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0))
  }, [data.cards])

  const stopAutoscroll = useCallback(() => {
    if (autoscrollFrame.current !== null) {
      cancelAnimationFrame(autoscrollFrame.current)
      autoscrollFrame.current = null
    }
    pendingScrollDir.current = 0
  }, [])

  const runAutoscroll = useCallback(() => {
    const el = scrollRef.current
    if (!el || pendingScrollDir.current === 0) {
      autoscrollFrame.current = null
      return
    }
    el.scrollTop += pendingScrollDir.current * AUTOSCROLL_SPEED
    autoscrollFrame.current = requestAnimationFrame(runAutoscroll)
  }, [])

  const addCard = useCallback(() => {
    const cards = data.cards ?? []
    const lastOrder = cards.length > 0 ? cards[cards.length - 1].order : null
    const newCard: FlexBoxCardData = {
      id: crypto.randomUUID(),
      content: "",
      order: orderKeyBetween(lastOrder, null),
    }
    recordSnapshot()
    updateWidget(widgetId, { data: { cards: [...cards, newCard] } })
  }, [data.cards, updateWidget, recordSnapshot, widgetId])

  const deleteCard = useCallback(
    (cardId: string) => {
      const cards = (data.cards ?? []).filter((c) => c.id !== cardId)
      recordSnapshot()
      updateWidget(widgetId, { data: { cards } })
    },
    [data.cards, updateWidget, recordSnapshot, widgetId],
  )

  const updateCardContent = useCallback(
    (cardId: string, content: string) => {
      const cards = (data.cards ?? []).map((c) => (c.id === cardId ? { ...c, content } : c))
      updateWidget(widgetId, { data: { cards } })
    },
    [data.cards, updateWidget, widgetId],
  )

  const handleCardResize = useCallback(
    (cardId: string, rows: number) => {
      const cards = (data.cards ?? []).map((c) => (c.id === cardId ? { ...c, rows } : c))
      updateWidget(widgetId, { data: { cards } })
    },
    [data.cards, updateWidget, widgetId],
  )

  const handleCardDragStart = useCallback(
    (e: React.PointerEvent, cardId: string) => {
      e.stopPropagation()
      e.preventDefault()
      recordSnapshot()

      const card = sortedCards.find((c) => c.id === cardId)

      setFlexboxDnd({
        dragging: true,
        cardId,
        cardContent: card?.content ?? "",
        sourceWidgetId: widgetId,
        position: { x: e.clientX, y: e.clientY },
      })

      let didDrag = false
      let currentDropTarget: DropTarget | null = null
      let targetWidgetId: string | null = null
      let autoscrollRaf: number | null = null
      let autoScrollDir = 0
      let highlightedEl: HTMLElement | null = null

      const unhighlight = () => {
        if (highlightedEl) {
          highlightedEl.classList.remove(...HIGHLIGHT_CLASSES)
          highlightedEl = null
        }
      }

      const stopLocalAutoscroll = () => {
        if (autoscrollRaf !== null) {
          cancelAnimationFrame(autoscrollRaf)
          autoscrollRaf = null
        }
        autoScrollDir = 0
      }

      const runLocalAutoscroll = () => {
        if (autoScrollDir === 0) {
          autoscrollRaf = null
          return
        }
        const targetEl = document.querySelector<HTMLElement>(`[data-flexbox-id="${currentDropTarget?.widgetId}"]`)
        const scrollContainer = targetEl?.querySelector<HTMLElement>(".scroll-fade")
        if (scrollContainer) {
          scrollContainer.scrollTop += autoScrollDir * AUTOSCROLL_SPEED
        }
        autoscrollRaf = requestAnimationFrame(runLocalAutoscroll)
      }

      const handlePointerMove = (ev: PointerEvent) => {
        setFlexboxDnd({ position: { x: ev.clientX, y: ev.clientY } })

        const targetFlexBox = findFlexBoxUnderPointer(ev.clientX, ev.clientY)
        if (!targetFlexBox) {
          currentDropTarget = null
          setLocalDropTarget(null)
          stopLocalAutoscroll()
          unhighlight()
          return
        }

        if (highlightedEl !== targetFlexBox) {
          unhighlight()
          highlightedEl = targetFlexBox
          highlightedEl.classList.add(...HIGHLIGHT_CLASSES)
        }

        didDrag = true
        targetWidgetId = targetFlexBox.getAttribute("data-flexbox-id")!
        const best = computeDropTargetInContainer(targetFlexBox, cardId, ev.clientY)
        currentDropTarget = best ? { widgetId: targetWidgetId, ...best } : null
        setLocalDropTarget(currentDropTarget)

        const scrollContainer = targetFlexBox.querySelector<HTMLElement>(".scroll-fade")
        if (scrollContainer) {
          const containerRect = scrollContainer.getBoundingClientRect()
          if (ev.clientY < containerRect.top + AUTOSCROLL_EDGE_PX) {
            autoScrollDir = -1
          } else if (ev.clientY > containerRect.bottom - AUTOSCROLL_EDGE_PX) {
            autoScrollDir = 1
          } else {
            autoScrollDir = 0
          }
          if (autoScrollDir !== 0 && autoscrollRaf === null) {
            autoscrollRaf = requestAnimationFrame(runLocalAutoscroll)
          }
        }
      }

      const handlePointerUp = () => {
        document.removeEventListener("pointermove", handlePointerMove)
        document.removeEventListener("pointerup", handlePointerUp)
        stopLocalAutoscroll()
        setLocalDropTarget(null)
        unhighlight()

        if (didDrag && targetWidgetId) {
          moveFlexBoxCard(
            widgetId,
            targetWidgetId,
            cardId,
            currentDropTarget?.position === "after" ? currentDropTarget.cardId : null,
            currentDropTarget?.position === "before" ? currentDropTarget.cardId : null,
          )
        }

        clearFlexboxDnd()
      }

      document.addEventListener("pointermove", handlePointerMove)
      document.addEventListener("pointerup", handlePointerUp)
    },
    [sortedCards, widgetId, recordSnapshot, setFlexboxDnd, moveFlexBoxCard, clearFlexboxDnd],
  )

  useEffect(() => {
    return () => {
      stopAutoscroll()
    }
  }, [stopAutoscroll])

  return (
    <div
      className="flex h-full flex-col p-3 gap-2"
    >
      <div
        ref={scrollRef}
        className="scroll-fade scrollbar-thin flex-1 min-h-0 overflow-y-auto space-y-1"
      >
        {sortedCards.map((card) => (
          <FlexBoxCard
            key={card.id}
            card={card}
            isDragging={false}
            isDropTarget={localDropTarget?.widgetId === widgetId && localDropTarget?.cardId === card.id}
            dropPosition={
              localDropTarget?.widgetId === widgetId && localDropTarget?.cardId === card.id
                ? localDropTarget.position
                : null
            }
            onDragStart={handleCardDragStart}
            onContentChange={updateCardContent}
            onResize={handleCardResize}
            onDelete={deleteCard}
          />
        ))}

        {sortedCards.length === 0 && (
          <p className="text-[10px] text-muted-foreground text-center py-4">No cards yet.<br />You can move cards between boxes.</p>
        )}
      </div>

      <button
        onClick={addCard}
        onPointerDown={(e) => e.stopPropagation()}
        className="shrink-0 rounded-md border border-dashed border-muted-foreground/30 px-2 py-1.5 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
      >
        + Add card
      </button>
    </div>
  )
})
