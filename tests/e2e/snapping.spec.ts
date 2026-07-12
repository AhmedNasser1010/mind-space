import { expect, test } from "@playwright/test"
import { CanvasPage } from "./pages/canvas-page"

// Object snapping shipped in advisor/023-snap-alignment (edge + center
// matching within SNAP_THRESHOLD_PX = 8 screen px, red guide lines) and
// advisor/025-gap-snapping (equal-gap placement between a candidate pair).
// advisor/027-hard-grid-lock then made every store write path re-quantize
// positions to the 20px grid. Since the snap threshold (8) is below half a
// grid cell (10), final drop positions are always on-grid; what snapping
// observably adds is the guide overlay during the drag, the flush aligned
// drop, and cmd/ctrl suppressing the whole system (no guides even for
// perfect alignment).

test.describe("snap alignment", () => {
  test("edge snap shows guides during the drag and drops flush; guides vanish", async ({ page }) => {
    const canvas = new CanvasPage(page)
    await canvas.seedSheet([
      { id: "a", type: "note", title: "Alpha", x: 100, y: 100, width: 200, height: 200, data: { content: "" } },
      { id: "b", type: "note", title: "Beta", x: 500, y: 100, width: 200, height: 200, data: { content: "" } },
    ])
    await canvas.goto()

    // Raw target x = 294: Alpha's right edge (494) is 6px from Beta's left
    // edge (500), inside the 8px threshold, so snap pulls Alpha flush to
    // x = 300 mid-drag.
    await canvas.beginWidgetDrag("Alpha", 194, 0)
    await expect(canvas.widget("Alpha")).toHaveCSS("left", "300px")
    // Edge guide at the shared x plus y guides for the aligned rows.
    await expect(canvas.snapGuides.first()).toBeVisible()
    await canvas.endDrag()

    await expect(canvas.snapGuides).toHaveCount(0)
    expect(await canvas.readWidgetPosition("Alpha")).toEqual({ x: 300, y: 100 })
  })

  test("cmd/ctrl suppresses snapping: no guides even for perfect alignment", async ({ page }) => {
    const canvas = new CanvasPage(page)
    await canvas.seedSheet([
      { id: "a", type: "note", title: "Alpha", x: 100, y: 100, width: 200, height: 200, data: { content: "" } },
      { id: "b", type: "note", title: "Beta", x: 500, y: 100, width: 200, height: 200, data: { content: "" } },
    ])
    await canvas.goto()

    // Same gesture as the edge-snap spec, and the y rows stay perfectly
    // aligned the whole way - without the modifier that always produces
    // guides. With it the snap system must stay silent.
    await canvas.beginWidgetDrag("Alpha", 194, 0, ["ControlOrMeta"])
    await expect(canvas.widget("Alpha")).toHaveCSS("left", "300px")
    await expect(canvas.snapGuides).toHaveCount(0)
    await canvas.endDrag(["ControlOrMeta"])

    // The hard grid still applies: quantize(294) = 300.
    expect(await canvas.readWidgetPosition("Alpha")).toEqual({ x: 300, y: 100 })
  })

  test("shift locks the drag to the dominant axis", async ({ page }) => {
    const canvas = new CanvasPage(page)
    await canvas.seedSheet([
      { id: "a", type: "note", title: "Alpha", x: 100, y: 100, width: 200, height: 200, data: { content: "" } },
      { id: "b", type: "note", title: "Beta", x: 500, y: 100, width: 200, height: 200, data: { content: "" } },
    ])
    await canvas.goto()

    // |dx| > |dy| so the y axis is locked: y stays exactly 100 (a free
    // drag would have quantized it to 160) while x moves the full 140.
    await canvas.dragWidgetBy("Alpha", 140, 60, ["Shift"])
    expect(await canvas.readWidgetPosition("Alpha")).toEqual({ x: 240, y: 100 })
  })

  test("gap snap draws the gap guide between a pair and drops on-grid", async ({ page }) => {
    const canvas = new CanvasPage(page)
    // Alpha-Beta gap on x: 300 -> 400 (width 100, center 350).
    await canvas.seedSheet([
      { id: "a", type: "note", title: "Alpha", x: 100, y: 100, width: 200, height: 200, data: { content: "" } },
      { id: "b", type: "note", title: "Beta", x: 400, y: 100, width: 200, height: 200, data: { content: "" } },
      { id: "c", type: "note", title: "Gamma", x: 100, y: 400, width: 200, height: 200, data: { content: "" } },
    ])
    await canvas.goto()

    // Raw target (252, 154): Gamma's center x (352) is 2px from the gap
    // center (350) - the center-in-gap match renders one gap guide line
    // plus its two end ticks. No edge match is anywhere near, so exactly
    // these 3 guide divs show.
    await canvas.beginWidgetDrag("Gamma", 152, -246)
    await expect(canvas.snapGuides).toHaveCount(3)
    await canvas.endDrag()

    await expect(canvas.snapGuides).toHaveCount(0)
    // The hard grid has the final say over the snapped x (250 -> 260).
    expect(await canvas.readWidgetPosition("Gamma")).toEqual({ x: 260, y: 160 })
  })
})
