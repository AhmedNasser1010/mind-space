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
}

export interface SnapResult {
  dx: number
  dy: number
  snappedX: boolean
  snappedY: boolean
  guides: GuideLine[]
}

export const SNAP_THRESHOLD_PX = 8

const EPS = 0.5

function edgesX(r: Rect): number[] {
  return [r.x, r.x + r.width / 2, r.x + r.width]
}

function edgesY(r: Rect): number[] {
  return [r.y, r.y + r.height / 2, r.y + r.height]
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

export function computeSnap(moving: Rect, candidates: Rect[], threshold: number, lockedAxis?: "x" | "y"): SnapResult {
  const movingXEdges = edgesX(moving)
  const movingYEdges = edgesY(moving)

  const xSnap = lockedAxis === "x" ? { delta: 0, matched: false } : findAxisSnap(movingXEdges, candidates, edgesX, threshold)
  const ySnap = lockedAxis === "y" ? { delta: 0, matched: false } : findAxisSnap(movingYEdges, candidates, edgesY, threshold)

  if (!xSnap.matched && !ySnap.matched) {
    return { dx: 0, dy: 0, snappedX: false, snappedY: false, guides: [] }
  }

  const dx = xSnap.matched ? xSnap.delta : 0
  const dy = ySnap.matched ? ySnap.delta : 0

  const movingSnapped: Rect = { x: moving.x + dx, y: moving.y + dy, width: moving.width, height: moving.height }

  const guides: GuideLine[] = []
  if (xSnap.matched) {
    guides.push(...collectGuides("x", edgesX(movingSnapped), candidates, movingSnapped, edgesX, edgesY))
  }
  if (ySnap.matched) {
    guides.push(...collectGuides("y", edgesY(movingSnapped), candidates, movingSnapped, edgesY, edgesX))
  }

  return { dx, dy, snappedX: xSnap.matched, snappedY: ySnap.matched, guides }
}
