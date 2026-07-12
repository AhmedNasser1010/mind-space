"use client"

import { memo } from "react"
import { useStore } from "@/store"
import { useInteractionStore } from "@/store/interaction"

const GAP_TICK_SCREEN_PX = 6

export const SnapGuides = memo(function SnapGuides() {
  const guides = useInteractionStore((s) => s.guides)
  const scale = useStore((s) => s.canvasState.scale)

  if (guides.length === 0) return null

  const tickLength = GAP_TICK_SCREEN_PX / scale

  return (
    <>
      {guides.map((g, i) => {
        const isGap = g.kind === "gap"
        const thickness = (isGap ? 0.5 : 1) / scale

        return (
          <div key={i}>
            <div
              className="absolute bg-red-500 pointer-events-none"
              style={
                g.axis === "x"
                  ? {
                      left: g.position,
                      top: g.start,
                      width: thickness,
                      height: g.end - g.start,
                      zIndex: 99999,
                    }
                  : {
                      top: g.position,
                      left: g.start,
                      height: thickness,
                      width: g.end - g.start,
                      zIndex: 99999,
                    }
              }
            />
            {isGap && (
              <>
                <div
                  className="absolute bg-red-500 pointer-events-none"
                  style={
                    g.axis === "x"
                      ? { left: g.position - tickLength / 2, top: g.start, width: tickLength, height: thickness, zIndex: 99999 }
                      : { top: g.position - tickLength / 2, left: g.start, height: tickLength, width: thickness, zIndex: 99999 }
                  }
                />
                <div
                  className="absolute bg-red-500 pointer-events-none"
                  style={
                    g.axis === "x"
                      ? { left: g.position - tickLength / 2, top: g.end, width: tickLength, height: thickness, zIndex: 99999 }
                      : { top: g.position - tickLength / 2, left: g.end, height: tickLength, width: thickness, zIndex: 99999 }
                  }
                />
              </>
            )}
          </div>
        )
      })}
    </>
  )
})
