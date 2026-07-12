"use client"

import { memo } from "react"
import { useStore } from "@/store"
import { useInteractionStore } from "@/store/interaction"

export const SnapGuides = memo(function SnapGuides() {
  const guides = useInteractionStore((s) => s.guides)
  const scale = useStore((s) => s.canvasState.scale)

  if (guides.length === 0) return null

  return (
    <>
      {guides.map((g, i) => (
        <div
          key={i}
          className="absolute bg-red-500 pointer-events-none"
          style={
            g.axis === "x"
              ? {
                  left: g.position,
                  top: g.start,
                  width: 1 / scale,
                  height: g.end - g.start,
                  zIndex: 99999,
                }
              : {
                  top: g.position,
                  left: g.start,
                  height: 1 / scale,
                  width: g.end - g.start,
                  zIndex: 99999,
                }
          }
        />
      ))}
    </>
  )
})
