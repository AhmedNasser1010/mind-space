export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface GuideLine {
  axis: "x" | "y" // "x" = vertical line at position (x const), "y" = horizontal
  position: number // world coordinate on the snapped axis
  start: number // extent along the other axis (world)
  end: number
  kind?: "edge" | "gap"
}

export interface SnapResult {
  dx: number
  dy: number
  snappedX: boolean
  snappedY: boolean
  guides: GuideLine[]
}

export interface Gap {
  start: number // facing edge of the earlier rect on the primary axis
  end: number // facing edge of the later rect on the primary axis
  breadthMin: number // perpendicular overlap range
  breadthMax: number
}

// Internal-only shape: carries the pair's OUTER edges (the far side of each
// rect, away from the gap) so replication targets can be measured from them
// (e.g. B.right + gapWidth), while the public Gap contract stays 4 fields.
interface InternalGap extends Gap {
  outerStart: number // far edge of the earlier rect (away from the gap)
  outerEnd: number // far edge of the later rect (away from the gap)
}

export const SNAP_THRESHOLD_PX = 8

const EPS = 0.5

function edgesX(r: Rect): number[] {
  return [r.x, r.x + r.width / 2, r.x + r.width]
}

function edgesY(r: Rect): number[] {
  return [r.y, r.y + r.height / 2, r.y + r.height]
}

function primaryRange(r: Rect, axis: "x" | "y"): [number, number] {
  return axis === "x" ? [r.x, r.x + r.width] : [r.y, r.y + r.height]
}

function perpRange(r: Rect, axis: "x" | "y"): [number, number] {
  return axis === "x" ? [r.y, r.y + r.height] : [r.x, r.x + r.width]
}

function computeGapsOnAxis(candidates: Rect[], axis: "x" | "y"): InternalGap[] {
  const gaps: InternalGap[] = []
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const a = candidates[i]
      const b = candidates[j]
      const [aStart, aEnd] = primaryRange(a, axis)
      const [bStart, bEnd] = primaryRange(b, axis)

      // Order the pair so `first` is entirely before `second` on the primary axis.
      const [first, second] = aEnd <= bStart ? [{ start: aStart, end: aEnd }, { start: bStart, end: bEnd }] : bEnd <= aStart ? [{ start: bStart, end: bEnd }, { start: aStart, end: aEnd }] : [null, null]

      if (!first || !second) continue

      const gapStart = first.end
      const gapEnd = second.start
      if (gapEnd - gapStart <= EPS) continue

      const [aPerpMin, aPerpMax] = perpRange(a, axis)
      const [bPerpMin, bPerpMax] = perpRange(b, axis)
      const breadthMin = Math.max(aPerpMin, bPerpMin)
      const breadthMax = Math.min(aPerpMax, bPerpMax)
      if (breadthMax - breadthMin <= EPS) continue

      gaps.push({ start: gapStart, end: gapEnd, breadthMin, breadthMax, outerStart: first.start, outerEnd: second.end })
    }
  }
  return gaps
}

export function computeGaps(candidates: Rect[]): { x: Gap[]; y: Gap[] } {
  return {
    x: computeGapsOnAxis(candidates, "x"),
    y: computeGapsOnAxis(candidates, "y"),
  }
}

function findAxisSnap(movingEdges: number[], candidates: Rect[], edgesOf: (r: Rect) => number[], threshold: number) {
  let bestDelta = 0
  let bestDist = threshold
  let matched = false
  for (const candidate of candidates) {
    for (const cEdge of edgesOf(candidate)) {
      for (const mEdge of movingEdges) {
        const delta = cEdge - mEdge
        const dist = Math.abs(delta)
        if (dist < bestDist) {
          bestDist = dist
          bestDelta = delta
          matched = true
        }
      }
    }
  }
  return { delta: bestDelta, matched }
}

interface GapMatch {
  delta: number
  guides: GuideLine[]
}

function gapGuideLine(axis: "x" | "y", gap: Gap): GuideLine {
  return {
    axis,
    position: (gap.breadthMin + gap.breadthMax) / 2,
    start: gap.start,
    end: gap.end,
    kind: "gap",
  }
}

function findGapSnap(moving: Rect, gaps: Gap[], axis: "x" | "y", threshold: number): GapMatch | null {
  const [movingStart, movingEnd] = primaryRange(moving, axis)
  const movingWidth = movingEnd - movingStart
  const movingCenter = (movingStart + movingEnd) / 2
  const [movingPerpMin, movingPerpMax] = perpRange(moving, axis)

  let best: GapMatch | null = null
  let bestDist = threshold

  for (const g of gaps) {
    const gap = g as InternalGap
    // Only a candidate if moving overlaps the gap's perpendicular breadth -
    // otherwise the widget isn't aligned with the pair on the cross axis.
    if (movingPerpMax <= gap.breadthMin || movingPerpMin >= gap.breadthMax) continue

    const gapWidth = gap.end - gap.start

    // Case 1: center-in-gap.
    const gapCenter = (gap.start + gap.end) / 2
    const centerOffset = gapCenter - movingCenter
    if (Math.abs(centerOffset) < bestDist) {
      bestDist = Math.abs(centerOffset)
      best = { delta: centerOffset, guides: [gapGuideLine(axis, gap)] }
    }

    // Case 2: side-right/bottom - place moving after the pair, replicating the
    // gap measured from the pair's outer (far) edge: outerEnd + gapWidth = moving start.
    const afterTarget = gap.outerEnd + gapWidth
    const afterOffset = afterTarget - movingStart
    if (Math.abs(afterOffset) < bestDist) {
      bestDist = Math.abs(afterOffset)
      const replicated: Gap = { start: gap.outerEnd, end: gap.outerEnd + gapWidth, breadthMin: gap.breadthMin, breadthMax: gap.breadthMax }
      best = { delta: afterOffset, guides: [gapGuideLine(axis, gap), gapGuideLine(axis, replicated)] }
    }

    // Case 3: side-left/top - place moving before the pair, replicating the
    // gap measured from the pair's outer (far) edge: moving end + gapWidth = outerStart.
    const beforeTarget = gap.outerStart - gapWidth - movingWidth
    const beforeOffset = beforeTarget - movingStart
    if (Math.abs(beforeOffset) < bestDist) {
      bestDist = Math.abs(beforeOffset)
      const replicated: Gap = { start: gap.outerStart - gapWidth, end: gap.outerStart, breadthMin: gap.breadthMin, breadthMax: gap.breadthMax }
      best = { delta: beforeOffset, guides: [gapGuideLine(axis, replicated), gapGuideLine(axis, gap)] }
    }
  }

  return best
}

function collectGuides(
  axis: "x" | "y",
  snappedEdges: number[],
  candidates: Rect[],
  movingSnapped: Rect,
  edgesOnAxis: (r: Rect) => number[],
  edgesPerp: (r: Rect) => number[]
): GuideLine[] {
  const guides: GuideLine[] = []
  const seen = new Set<number>()

  for (const snappedEdge of snappedEdges) {
    const matching = candidates.filter((c) => edgesOnAxis(c).some((e) => Math.abs(e - snappedEdge) < EPS))
    if (matching.length === 0) continue

    // Dedup by rounded position so overlapping edges don't emit duplicate guides.
    const key = Math.round(snappedEdge * 1000)
    if (seen.has(key)) continue
    seen.add(key)

    const perpValues = [...edgesPerp(movingSnapped)]
    for (const c of matching) {
      perpValues.push(...edgesPerp(c))
    }
    const start = Math.min(...perpValues)
    const end = Math.max(...perpValues)

    guides.push({ axis, position: snappedEdge, start, end })
  }

  return guides
}

export function computeSnap(
  moving: Rect,
  candidates: Rect[],
  threshold: number,
  lockedAxis?: "x" | "y",
  gaps?: { x: Gap[]; y: Gap[] }
): SnapResult {
  const movingXEdges = edgesX(moving)
  const movingYEdges = edgesY(moving)

  const xSnap = lockedAxis === "x" ? { delta: 0, matched: false } : findAxisSnap(movingXEdges, candidates, edgesX, threshold)
  const ySnap = lockedAxis === "y" ? { delta: 0, matched: false } : findAxisSnap(movingYEdges, candidates, edgesY, threshold)

  let xGapGuides: GuideLine[] = []
  let yGapGuides: GuideLine[] = []

  if (lockedAxis !== "x" && gaps) {
    const xGapMatch = findGapSnap(moving, gaps.x, "x", threshold)
    if (xGapMatch && (!xSnap.matched || Math.abs(xGapMatch.delta) < Math.abs(xSnap.delta))) {
      xSnap.delta = xGapMatch.delta
      xSnap.matched = true
      xGapGuides = xGapMatch.guides
    }
  }

  if (lockedAxis !== "y" && gaps) {
    const yGapMatch = findGapSnap(moving, gaps.y, "y", threshold)
    if (yGapMatch && (!ySnap.matched || Math.abs(yGapMatch.delta) < Math.abs(ySnap.delta))) {
      ySnap.delta = yGapMatch.delta
      ySnap.matched = true
      yGapGuides = yGapMatch.guides
    }
  }

  if (!xSnap.matched && !ySnap.matched) {
    return { dx: 0, dy: 0, snappedX: false, snappedY: false, guides: [] }
  }

  const dx = xSnap.matched ? xSnap.delta : 0
  const dy = ySnap.matched ? ySnap.delta : 0

  const movingSnapped: Rect = { x: moving.x + dx, y: moving.y + dy, width: moving.width, height: moving.height }

  const guides: GuideLine[] = []
  if (xSnap.matched) {
    guides.push(...(xGapGuides.length > 0 ? xGapGuides : collectGuides("x", edgesX(movingSnapped), candidates, movingSnapped, edgesX, edgesY)))
  }
  if (ySnap.matched) {
    guides.push(...(yGapGuides.length > 0 ? yGapGuides : collectGuides("y", edgesY(movingSnapped), candidates, movingSnapped, edgesY, edgesX)))
  }

  return { dx, dy, snappedX: xSnap.matched, snappedY: ySnap.matched, guides }
}
