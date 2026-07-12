"use client"

import { memo } from "react"
import { useInteractionStore } from "@/store/interaction"

export const MarqueeOverlay = memo(function MarqueeOverlay() {
  const marquee = useInteractionStore((s) => s.marquee)

  if (!marquee) return null

  return (
    <div
      className="absolute border border-primary bg-primary/10 pointer-events-none"
      style={{
        left: marquee.x,
        top: marquee.y,
        width: marquee.width,
        height: marquee.height,
        zIndex: 99999,
      }}
    />
  )
})
