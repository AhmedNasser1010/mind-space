import { expect, test } from "@playwright/test"
import { CanvasPage } from "./pages/canvas-page"

// Marquee multi-select shipped in advisor/022-multi-select-marquee: a plain
// left-drag on empty canvas draws a selection box instead of panning (pan
// moved to space-drag / middle-drag / wheel).
//
// Default sheet geometry (initializeDefaultState):
//   Welcome!        (160, 160) 320x280
//   Getting Started (540, 160) 300x280
//   Quick Links     (160, 500) 280x180

test.describe("marquee selection", () => {
  let canvas: CanvasPage

  test.beforeEach(async ({ page }) => {
    canvas = new CanvasPage(page)
    await canvas.goto()
  })

  test("dragging on empty canvas draws a marquee and selects overlapped widgets", async ({ page }) => {
    // Start above-left of everything, sweep across the two top widgets.
    const origin = await canvas.canvasOrigin()
    await page.mouse.move(origin.x + 100, origin.y + 100)
    await page.mouse.down()
    await page.mouse.move(origin.x + 350, origin.y + 180)
    // Mid-drag the overlay must be visible (it unmounts on pointerup).
    await expect(canvas.marqueeOverlay).toBeVisible()
    await page.mouse.move(origin.x + 600, origin.y + 250)
    await page.mouse.up()

    await expect(canvas.marqueeOverlay).toHaveCount(0)
    // Overlaps Welcome! and Getting Started; Quick Links (y 500+) is out.
    await canvas.expectSelectedCount(2)
  })

  test("shift+marquee unions with the existing selection", async () => {
    await canvas.marqueeSelect({ x: 80, y: 80, width: 160, height: 160 })
    await canvas.expectSelectedCount(1)

    // Second marquee starts on empty canvas above Getting Started and
    // sweeps into it; shift keeps Welcome! selected.
    await canvas.marqueeSelect({ x: 560, y: 100, width: 80, height: 160 }, { shift: true })
    await canvas.expectSelectedCount(2)
  })

  test("clicking empty canvas deselects everything", async () => {
    await canvas.marqueeSelect({ x: 100, y: 100, width: 500, height: 150 })
    await canvas.expectSelectedCount(2)

    await canvas.clickEmptyCanvas({ x: 80, y: 80 })
    await canvas.expectSelectedCount(0)
  })

  test("group drag moves the whole selection and one undo restores all", async () => {
    await canvas.marqueeSelect({ x: 100, y: 100, width: 500, height: 150 })
    await canvas.expectSelectedCount(2)

    // 80/60 are grid multiples, so with the 20px hard grid (advisor/027)
    // both drop positions are exact.
    await canvas.dragWidgetBy("Welcome!", 80, 60)
    expect(await canvas.readWidgetPosition("Welcome!")).toEqual({ x: 240, y: 220 })
    expect(await canvas.readWidgetPosition("Getting Started")).toEqual({ x: 620, y: 220 })

    await canvas.undo()
    expect(await canvas.readWidgetPosition("Welcome!")).toEqual({ x: 160, y: 160 })
    expect(await canvas.readWidgetPosition("Getting Started")).toEqual({ x: 540, y: 160 })
  })
})
