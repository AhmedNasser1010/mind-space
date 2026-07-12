import { describe, expect, it } from "vitest"
import { computeSnap, SNAP_THRESHOLD_PX, type Rect } from "./snap-align"

function rect(x: number, y: number, width = 100, height = 100): Rect {
  return { x, y, width, height }
}

describe("computeSnap", () => {
  it("snaps left edge to left edge within threshold", () => {
    const moving = rect(104, 0) // left edge at 104, candidate left edge at 100 -> dist 4
    const candidates = [rect(100, 300)]
    const result = computeSnap(moving, candidates, SNAP_THRESHOLD_PX)
    expect(result.snappedX).toBe(true)
    expect(result.dx).toBe(-4)
    expect(result.guides.some((g) => g.axis === "x")).toBe(true)
  })

  it("does not snap beyond threshold", () => {
    const moving = rect(120, 0) // left edge at 120, candidate left edge at 100 -> dist 20
    const candidates = [rect(100, 300)]
    const result = computeSnap(moving, candidates, SNAP_THRESHOLD_PX)
    expect(result.snappedX).toBe(false)
    expect(result.dx).toBe(0)
    expect(result.guides).toHaveLength(0)
  })

  it("matches center to center", () => {
    // moving center x = 55, candidate center x = 50 -> dist 5
    const moving = rect(5, 0)
    const candidates = [rect(0, 300)]
    const result = computeSnap(moving, candidates, SNAP_THRESHOLD_PX)
    expect(result.snappedX).toBe(true)
    expect(result.dx).toBe(-5)
  })

  it("matches right edge to left edge (adjacency)", () => {
    // moving right edge = x + 100. candidate left edge at 306. moving x = 200 -> right = 300, dist 6
    const moving = rect(200, 0)
    const candidates = [rect(306, 0, 100, 100)]
    const result = computeSnap(moving, candidates, SNAP_THRESHOLD_PX)
    expect(result.snappedX).toBe(true)
    expect(result.dx).toBe(6)
  })

  it("snaps X and Y independently in one call", () => {
    // X: moving left 104 vs candidate left 100 -> dx -4
    // Y: moving top 203 vs candidate top 200 -> dy -3
    const moving = rect(104, 203)
    const candidates = [rect(100, 200, 50, 50)]
    const result = computeSnap(moving, candidates, SNAP_THRESHOLD_PX)
    expect(result.snappedX).toBe(true)
    expect(result.snappedY).toBe(true)
    expect(result.dx).toBe(-4)
    expect(result.dy).toBe(-3)
  })

  it("nearest of two candidates wins", () => {
    const moving = rect(104, 0) // left edge 104
    const candidates = [rect(100, 300), rect(102, 500)] // dist 4 vs dist 2
    const result = computeSnap(moving, candidates, SNAP_THRESHOLD_PX)
    expect(result.dx).toBe(-2)
  })

  it("reports matched and a guide for an exact overlap (dx === 0)", () => {
    const moving = rect(100, 0)
    const candidates = [rect(100, 300)]
    const result = computeSnap(moving, candidates, SNAP_THRESHOLD_PX)
    expect(result.snappedX).toBe(true)
    expect(result.dx).toBe(0)
    expect(result.guides.some((g) => g.axis === "x" && g.position === 100)).toBe(true)
  })

  it("guide start/end spans the union of participating rects", () => {
    const moving = rect(104, 50, 100, 100) // snapped: x=100..200, y=50..150
    const candidate = rect(100, 400, 100, 100) // y 400..500
    const result = computeSnap(moving, [candidate], SNAP_THRESHOLD_PX)
    const guide = result.guides.find((g) => g.axis === "x")
    expect(guide).toBeDefined()
    expect(guide!.start).toBe(50)
    expect(guide!.end).toBe(500)
  })

  it("returns a zero result for empty candidates", () => {
    const moving = rect(0, 0)
    const result = computeSnap(moving, [], SNAP_THRESHOLD_PX)
    expect(result).toEqual({ dx: 0, dy: 0, snappedX: false, snappedY: false, guides: [] })
  })

  it("lockedAxis 'x' skips the x comparison but still snaps y", () => {
    const moving = rect(104, 203)
    const candidates = [rect(100, 200, 50, 50)]
    const result = computeSnap(moving, candidates, SNAP_THRESHOLD_PX, "x")
    expect(result.snappedX).toBe(false)
    expect(result.dx).toBe(0)
    expect(result.snappedY).toBe(true)
    expect(result.dy).toBe(-3)
    expect(result.guides.every((g) => g.axis === "y")).toBe(true)
  })

  it("lockedAxis 'y' skips the y comparison but still snaps x", () => {
    const moving = rect(104, 203)
    const candidates = [rect(100, 200, 50, 50)]
    const result = computeSnap(moving, candidates, SNAP_THRESHOLD_PX, "y")
    expect(result.snappedY).toBe(false)
    expect(result.dy).toBe(0)
    expect(result.snappedX).toBe(true)
    expect(result.dx).toBe(-4)
    expect(result.guides.every((g) => g.axis === "x")).toBe(true)
  })
})
