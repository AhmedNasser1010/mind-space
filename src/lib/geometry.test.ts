import { describe, expect, it } from "vitest"
import { rectsIntersect } from "./geometry"

describe("rectsIntersect", () => {
  it("returns true for overlapping rects", () => {
    const a = { x: 0, y: 0, width: 100, height: 100 }
    const b = { x: 50, y: 50, width: 100, height: 100 }
    expect(rectsIntersect(a, b)).toBe(true)
  })

  it("returns true when one rect fully contains the other", () => {
    const outer = { x: 0, y: 0, width: 200, height: 200 }
    const inner = { x: 50, y: 50, width: 20, height: 20 }
    expect(rectsIntersect(outer, inner)).toBe(true)
  })

  it("returns false when rects only touch edges (strict inequality)", () => {
    const a = { x: 0, y: 0, width: 100, height: 100 }
    const b = { x: 100, y: 0, width: 100, height: 100 }
    expect(rectsIntersect(a, b)).toBe(false)
  })

  it("returns false for disjoint rects", () => {
    const a = { x: 0, y: 0, width: 50, height: 50 }
    const b = { x: 200, y: 200, width: 50, height: 50 }
    expect(rectsIntersect(a, b)).toBe(false)
  })
})
